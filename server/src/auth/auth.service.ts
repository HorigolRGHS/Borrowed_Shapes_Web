import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../lib/prisma/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { init } from '@paralleldrive/cuid2';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const createId = init({ length: 24 });

/** Redis key for a user's active session on a given platform. */
const rtKey = (userId: string, platform: string) => `rt:${userId}:${platform}`;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  async register(dto: Pick<RegisterDto, 'email' | 'password' | 'displayName'> & { deviceInfo?: string }, ipAddress: string) {
    const rounds = parseInt(this.config.get('BCRYPT_ROUNDS', '10'), 10);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    try {
      const user = await this.prisma.$transaction(async (tx: any) => {
        const created = await tx.user.create({
          data: { email: dto.email, passwordHash, displayName: dto.displayName ?? null, role: 'USER' },
        });
        await tx.gameProfile.create({ data: { userId: created.id } });
        await tx.auditLog.create({
          data: {
            userId: created.id,
            actionType: 'CREATE',
            entityName: 'User',
            entityId: created.id,
            newValue: { email: created.email, role: created.role },
            ipAddress,
          },
        });
        return created;
      });

      return { userId: user.id, email: user.email, displayName: user.displayName, role: user.role };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes('displayName')) throw new ConflictException('Display name already taken');
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async login(dto: LoginDto, ipAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const sessionTtl = parseInt(this.config.get('SESSION_TTL_SEC', '604800'), 10);
    const accessTtl = parseInt(this.config.get('ACCESS_TOKEN_TTL_SEC', '900'), 10);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + sessionTtl * 1000).toISOString();

    // Revoke any existing session for this platform (1 session per platform)
    const existing = await this.redis.hgetall(rtKey(user.id, dto.platform));
    if (existing?.sessionId) {
      await this.prisma.userSession.updateMany({
        where: { sessionId: existing.sessionId, status: 'ACTIVE' },
        data: { status: 'REVOKED', logoutTime: new Date() },
      });
    }

    // Generate tokens
    const sessionId = createId();
    // Refresh token encodes userId + platform so the server can look up the Redis key without extra params
    const refreshToken = `${user.id}:${dto.platform}:${sessionId}`;
    const tokenHash = hashToken(refreshToken);
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role, platform: dto.platform },
      { expiresIn: accessTtl },
    );

    // Store refresh token hash in Redis — one key per user per platform (replaces old session)
    await this.redis.pipeline([
      { cmd: 'hset', args: [rtKey(user.id, dto.platform), { tokenHash, sessionId, expiresAt, deviceInfo: dto.deviceInfo ?? '', ipAddress, loginTime: now, lastActive: now }] },
      { cmd: 'expire', args: [rtKey(user.id, dto.platform), sessionTtl] },
      { cmd: 'zadd', args: ['online_users_by_last_active', Date.now(), sessionId] },
    ]);

    await Promise.all([
      this.prisma.userSession.create({
        data: { userId: user.id, sessionId, platform: dto.platform, ipAddress, deviceInfo: dto.deviceInfo, status: 'ACTIVE' },
      }),
      this.prisma.auditLog.create({
        data: { userId: user.id, actionType: 'LOGIN', entityName: 'UserSession', entityId: sessionId, ipAddress },
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      expiresAt,
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  async refresh(incomingRefreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // Parse: {userId}:{platform}:{sessionId}
    const firstColon = incomingRefreshToken.indexOf(':');
    const secondColon = incomingRefreshToken.indexOf(':', firstColon + 1);
    if (firstColon === -1 || secondColon === -1) throw new UnauthorizedException();

    const userId = incomingRefreshToken.slice(0, firstColon);
    const platform = incomingRefreshToken.slice(firstColon + 1, secondColon);

    const stored = await this.redis.hgetall(rtKey(userId, platform));
    if (!stored) throw new UnauthorizedException();

    if (stored.tokenHash !== hashToken(incomingRefreshToken)) throw new UnauthorizedException();
    if (new Date(stored.expiresAt) <= new Date()) {
      await this.redis.del(rtKey(userId, platform));
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw new UnauthorizedException();

    const sessionTtl = parseInt(this.config.get('SESSION_TTL_SEC', '604800'), 10);
    const accessTtl = parseInt(this.config.get('ACCESS_TOKEN_TTL_SEC', '900'), 10);
    const now = new Date().toISOString();

    // Rotate refresh token
    const newSessionId = createId();
    const newRefreshToken = `${userId}:${platform}:${newSessionId}`;
    const newTokenHash = hashToken(newRefreshToken);
    const newAccessToken = this.jwt.sign(
      { sub: userId, role: user.role, platform },
      { expiresIn: accessTtl },
    );

    await this.redis.pipeline([
      { cmd: 'hset', args: [rtKey(userId, platform), { tokenHash: newTokenHash, sessionId: newSessionId, lastActive: now }] },
      { cmd: 'expire', args: [rtKey(userId, platform), sessionTtl] },
      { cmd: 'zadd', args: ['online_users_by_last_active', Date.now(), newSessionId] },
    ]);

    // Update DB session record
    await this.prisma.userSession.updateMany({
      where: { sessionId: stored.sessionId, status: 'ACTIVE' },
      data: { sessionId: newSessionId },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: accessTtl };
  }

  async logout(userId: string, platform: string, ipAddress: string): Promise<void> {
    const stored = await this.redis.hgetall(rtKey(userId, platform));

    await this.redis.del(rtKey(userId, platform));
    if (stored?.sessionId) {
      await this.redis.zrem('online_users_by_last_active', stored.sessionId);
    }

    if (stored?.sessionId) {
      await this.prisma.userSession.updateMany({
        where: { sessionId: stored.sessionId, status: 'ACTIVE' },
        data: { status: 'LOGGED_OUT', logoutTime: new Date() },
      });
    }

    await this.prisma.auditLog.create({
      data: { userId, actionType: 'LOGOUT', entityName: 'UserSession', entityId: userId, ipAddress },
    });
  }
}
