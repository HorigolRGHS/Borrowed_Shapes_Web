import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { init } from '@paralleldrive/cuid2';
import { RedisService } from '../redis/redis.service';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import {
  RefreshRequestDto,
  RefreshResponseDto,
} from './dto/refresh.dto';
import {
  RegisterRequestDto,
  RegisterResponseDto,
} from './dto/register.dto';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { AuditLog } from '../entities/AuditLog';
import { GameProfile } from '../entities/GameProfile';
import { Role } from '../entities/Role';
import { SessionStatus } from '../entities/SessionStatus';
import { AuditActionType } from '../entities/AuditActionType';

const createId = init({ length: 24 });

/** Redis key for a user's active session on a given platform. */
const rtKey = (userId: string, platform: string) => `rt:${userId}:${platform}`;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private em: EntityManager,
    private redis: RedisService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  async register(
    dto: Pick<RegisterRequestDto, 'email' | 'password' | 'displayName'> & { deviceInfo?: string },
    ipAddress: string,
  ): Promise<RegisterResponseDto> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const email = dto.email;
    const password = dto.password;
    const rounds = parseInt(this.config.get('BCRYPT_ROUNDS', '10'), 10);
    const passwordHash = await bcrypt.hash(password, rounds);

    try {
      const user = await this.em.transactional(async (em) => {
        const created = em.create(User, {
          email,
          passwordHash,
          displayName: dto.displayName ?? null,
          role: Role.USER,
        });

        await em.flush();

        const gameProfile = em.create(GameProfile, { userId: created });
        const auditLog = em.create(AuditLog, {
          userId: created,
          actionType: AuditActionType.CREATE,
          entityName: 'User',
          entityId: created.id,
          newValue: { email: created.email, role: created.role },
          ipAddress,
        });
        await em.flush();
        // suppress unused variable warnings
        void gameProfile;
        void auditLog;
        return created;
      });

      return {
        userId: user.id,
        email: String(user.email),
        displayName: user.displayName ? String(user.displayName) : null,
        role: user.role,
      };
    } catch (err) {
      if (err instanceof UniqueConstraintViolationException) {
        const constraint = (err.cause as any)?.constraint ?? '';
        const message = err.message ?? '';
        if (constraint.includes('display_name') || message.includes('display_name')) {
          throw new ConflictException('Display name already taken');
        }
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async login(dto: LoginRequestDto, ipAddress: string): Promise<LoginResponseDto> {
    if (!dto.email || !dto.password || !dto.platform) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const email = dto.email;
    const password = dto.password;
    const platform = dto.platform;

    const user = await this.em.findOne(User, { email });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const currentTime = new Date();
    if (user.isBanned) {
      if (user.banExpiresAt && user.banExpiresAt <= currentTime) {
        user.isBanned = false;
        user.bannedAt = undefined;
        user.banReason = undefined;
        user.banExpiresAt = undefined;
        await this.em.flush();
      } else {
        throw new ForbiddenException(user.banReason ?? 'Account is banned');
      }
    }

    const valid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const sessionTtl = parseInt(this.config.get('SESSION_TTL_SEC', '604800'), 10);
    const accessTtl = parseInt(this.config.get('ACCESS_TOKEN_TTL_SEC', '900'), 10);
  const loginTime = currentTime.toISOString();
    const expiresAt = new Date(Date.now() + sessionTtl * 1000).toISOString();

    // Revoke any existing session for this platform (1 session per platform)
    const existing = await this.redis.hgetall(rtKey(user.id, platform));
    if (existing?.sessionId) {
      await this.em.nativeUpdate(
        UserSession,
        { sessionId: existing.sessionId, status: SessionStatus.ACTIVE },
        { status: SessionStatus.REVOKED, logoutTime: new Date() },
      );
    }

    // Generate tokens
    const sessionId = createId();
    // Refresh token encodes userId + platform so the server can look up the Redis key without extra params
    const refreshToken = `${user.id}:${platform}:${sessionId}`;
    const tokenHash = hashToken(refreshToken);
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role, platform },
      { expiresIn: accessTtl },
    );

    // Store refresh token hash in Redis — one key per user per platform (replaces old session)
    await this.redis.pipeline([
      { cmd: 'hset', args: [rtKey(user.id, platform), { tokenHash, sessionId, expiresAt, deviceInfo: dto.deviceInfo ?? '', ipAddress, loginTime, lastActive: loginTime }] },
      { cmd: 'expire', args: [rtKey(user.id, platform), sessionTtl] },
      { cmd: 'zadd', args: ['online_users_by_last_active', Date.now(), sessionId] },
    ]);

    const session = this.em.create(UserSession, {
      userId: user,
      sessionId,
      platform,
      ipAddress,
      deviceInfo: dto.deviceInfo,
      status: SessionStatus.ACTIVE,
    });
    const auditLog = this.em.create(AuditLog, {
      userId: user,
      actionType: AuditActionType.LOGIN,
      entityName: 'UserSession',
      entityId: sessionId,
      ipAddress,
    });
    await this.em.flush();
    void session;
    void auditLog;

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      expiresAt,
      user: {
        id: user.id,
        email: String(user.email),
        displayName: user.displayName ? String(user.displayName) : null,
        imgUrl: user.imgUrl ?? null,
        role: user.role,
        isBanned: user.isBanned,
        bannedAt: user.bannedAt ? user.bannedAt.toISOString() : null,
        banReason: user.banReason ?? null,
        banExpiresAt: user.banExpiresAt ? user.banExpiresAt.toISOString() : null,
      },
    };
  }

  async refresh(incomingRefreshToken: string): Promise<RefreshResponseDto> {
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

    const user = await this.em.findOne(User, { id: userId }, { fields: ['role'] });
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
    await this.em.nativeUpdate(
      UserSession,
      { sessionId: stored.sessionId, status: SessionStatus.ACTIVE },
      { sessionId: newSessionId },
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: accessTtl };
  }

  async logout(userId: string, platform: string, ipAddress: string): Promise<void> {
    const stored = await this.redis.hgetall(rtKey(userId, platform));

    await this.redis.del(rtKey(userId, platform));
    if (stored?.sessionId) {
      await this.redis.zrem('online_users_by_last_active', stored.sessionId);
    }

    if (stored?.sessionId) {
      await this.em.nativeUpdate(
        UserSession,
        { sessionId: stored.sessionId, status: SessionStatus.ACTIVE },
        { status: SessionStatus.LOGGED_OUT, logoutTime: new Date() },
      );
    }

    const auditLog = this.em.create(AuditLog, {
      userId: this.em.getReference(User, userId),
      actionType: AuditActionType.LOGOUT,
      entityName: 'UserSession',
      entityId: userId,
      ipAddress,
    });
    await this.em.flush();
    void auditLog;
  }
}
