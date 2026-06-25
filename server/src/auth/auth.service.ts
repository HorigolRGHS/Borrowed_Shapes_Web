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
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { LoginRequestDto, LoginResponseDto } from './dto/login.dto';
import {
  GoogleExchangeRequestDto,
  GoogleExchangeResponseDto,
  GoogleCompleteRequestDto,
  GoogleCompleteResponseDto,
} from './dto/google.dto';
import { RefreshRequestDto, RefreshResponseDto } from './dto/refresh.dto';
import { RegisterRequestDto, RegisterResponseDto } from './dto/register.dto';
import {
  VerifyEmailRequestDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  ChangePasswordRequestDto,
} from './dto/password.dto';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { AuditLog } from '../entities/AuditLog';
import { ensureAccountActive, getProxyAvatarUrl } from './auth-utils';
import { GameProfile } from '../entities/GameProfile';
import { Role } from '../entities/Role';
import { SessionStatus } from '../entities/SessionStatus';
import { AuditActionType } from '../entities/AuditActionType';
import { UserOnlineStatus } from '../entities/UserOnlineStatus';

const createId = () => randomUUID();

/** Redis key for a user's active session on a given platform. */
const rtKey = (userId: string, platform: string) => `rt:${userId}:${platform}`;
const presenceDetailsKey = (sessionId: string) =>
  `user_session_details:${sessionId}`;
const onlineZsetKey = 'online_users_by_last_active';

/** Redis key for email verification token. */
const emailVerifyTokenKey = (token: string) => `email_verify:${token}`;

/** Redis key for forgot-password OTP by email. */
const forgotOtpKey = (email: string) => `forgot_otp:${email.toLowerCase()}`;

/** Redis key for one-time google login codes. */
const googleLoginCodeKey = (loginCode: string) =>
  `google_login_code:${loginCode}`;

function parseDurationSeconds(
  input: string | undefined,
  fallbackSeconds: number,
): number {
  if (!input) return fallbackSeconds;
  const raw = String(input).trim();
  if (!raw) return fallbackSeconds;

  if (/^\d+$/.test(raw)) {
    const v = parseInt(raw, 10);
    return Number.isFinite(v) && v > 0 ? v : fallbackSeconds;
  }

  const m = raw.match(/^(\d+)\s*([mhd])$/i);
  if (!m) return fallbackSeconds;
  const value = parseInt(m[1], 10);
  if (!Number.isFinite(value) || value <= 0) return fallbackSeconds;
  const unit = m[2].toLowerCase();
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 60 * 60;
  if (unit === 'd') return value * 24 * 60 * 60;
  return fallbackSeconds;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function generateOtp(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

@Injectable()
export class AuthService {
  constructor(
    private em: EntityManager,
    private redis: RedisService,
    private config: ConfigService,
    private jwt: JwtService,
    private email: EmailService,
  ) {}

  private async fetchGoogleUserInfo(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('auth.google_not_configured');
    }

    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    const tokenJson: {
      access_token?: string;
      error?: string;
      error_description?: string;
    } = await tokenRes.json().catch(() => ({}));

    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new UnauthorizedException(
        tokenJson.error_description ?? 'auth.google_exchange_failed',
      );
    }

    const infoRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      },
    );

    const infoJson: {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    } = await infoRes.json().catch(() => ({}));

    if (!infoRes.ok || !infoJson.sub || !infoJson.email) {
      throw new UnauthorizedException('auth.invalid_google_token');
    }

    return infoJson;
  }

  // Removed ensureNotBanned in favor of ensureAccountActive from auth-utils.ts

  private async getOrCreateGameProfile(user: User): Promise<GameProfile> {
    const existing = await this.em.findOne(GameProfile, { userId: user.id });
    if (existing) return existing;

    const created = this.em.create(GameProfile, { userId: user });
    await this.em.flush();
    return created;
  }

  private toAuthUserResponse(user: User, gameProfile: GameProfile) {
    return {
      id: user.id,
      gameProfileId: gameProfile.id,
      email: String(user.email),
      displayName: user.displayName ? String(user.displayName) : null,
      imgUrl: getProxyAvatarUrl(user.imgUrl, user.id, user.updatedAt),
      role: user.role,
      isBanned: user.isBanned,
      bannedAt: user.bannedAt ? user.bannedAt.toISOString() : null,
      banReason: user.banReason ?? null,
      banExpiresAt: user.banExpiresAt ? user.banExpiresAt.toISOString() : null,
    };
  }

  private async issueLoginTokens(
    user: User,
    gameProfile: GameProfile,
    platform: string,
    deviceInfo: string | undefined,
    ipAddress: string,
  ): Promise<LoginResponseDto> {
    const sessionTtl = parseInt(
      this.config.get('SESSION_TTL_SEC', '604800'),
      10,
    );
    const accessTtl = parseInt(
      this.config.get('ACCESS_TOKEN_TTL_SEC', '900'),
      10,
    );
    const loginTime = new Date().toISOString();
    const expiresAt = new Date(Date.now() + sessionTtl * 1000).toISOString();

    // Revoke any existing session for this platform (1 session per platform)
    const existing = await this.redis.hgetall(rtKey(user.id, platform));
    if (existing?.sessionId) {
      await this.em.nativeUpdate(
        UserSession,
        { sessionId: existing.sessionId, status: SessionStatus.ACTIVE },
        { status: SessionStatus.REVOKED, logoutTime: new Date() },
      );
      await this.redis.pipeline([
        { cmd: 'zrem', args: [onlineZsetKey, existing.sessionId] },
        { cmd: 'del', args: [presenceDetailsKey(existing.sessionId)] },
      ]);
    }

    const sessionId = createId();
    const refreshToken = `${user.id}:${platform}:${sessionId}`;
    const tokenHash = hashToken(refreshToken);
    const accessToken = this.jwt.sign(
      {
        sub: user.id,
        sid: sessionId,
        role: user.role,
        pf: platform,
        gp: gameProfile.id,
      },
      { expiresIn: accessTtl },
    );

    await this.redis.pipeline([
      {
        cmd: 'hset',
        args: [
          rtKey(user.id, platform),
          {
            tokenHash,
            sessionId,
            expiresAt,
            deviceInfo: deviceInfo ?? '',
            ipAddress,
            loginTime,
            lastActive: loginTime,
          },
        ],
      },
      { cmd: 'expire', args: [rtKey(user.id, platform), sessionTtl] },
      {
        cmd: 'hset',
        args: [
          presenceDetailsKey(sessionId),
          { userId: user.id, platform, lastActive: loginTime },
        ],
      },
      { cmd: 'expire', args: [presenceDetailsKey(sessionId), sessionTtl] },
      { cmd: 'zadd', args: [onlineZsetKey, Date.now(), sessionId] },
    ]);

    const session = this.em.create(UserSession, {
      userId: user,
      sessionId,
      platform,
      ipAddress,
      deviceInfo,
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
      user: this.toAuthUserResponse(user, gameProfile),
    };
  }

  async register(
    dto: Pick<RegisterRequestDto, 'email' | 'password' | 'displayName'> & {
      deviceInfo?: string;
    },
    ipAddress: string,
  ): Promise<RegisterResponseDto> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('auth.email_password_required');
    }

    const email = dto.email;
    const password = dto.password;
    const rounds = parseInt(this.config.get('BCRYPT_ROUNDS', '10'), 10);
    const passwordHash = await bcrypt.hash(password, rounds);

    try {
      const result = await this.em.transactional(async (em) => {
        let user = await em.findOne(User, { email });

        if (user) {
          if (
            user.isBanned &&
            user.banReason === 'auth.unverified_email_ban_reason'
          ) {
            user.passwordHash = passwordHash;
            user.displayName = dto.displayName ?? email.split('@')[0];
            user.bannedAt = new Date();

            const auditLog = em.create(AuditLog, {
              userId: user,
              actionType: AuditActionType.UPDATE,
              entityName: 'User',
              entityId: user.id,
              newValue: {
                email: user.email,
                note: 'Re-registration before email verify',
              },
              ipAddress,
            });
            await em.flush();
            void auditLog;

            let gameProfile = await em.findOne(GameProfile, {
              userId: user.id,
            });
            if (!gameProfile) {
              gameProfile = em.create(GameProfile, { userId: user });
              await em.flush();
            }

            return { user, gameProfile };
          } else {
            throw new ConflictException('auth.email_in_use');
          }
        }

        const created = em.create(User, {
          email,
          passwordHash,
          displayName: dto.displayName ?? email.split('@')[0],
          role: Role.USER,
          isBanned: true, // Auto-ban until email is verified
          bannedAt: new Date(),
          banReason: 'auth.unverified_email_ban_reason',
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
        void auditLog;

        return {
          user: created,
          gameProfile,
        };
      });

      // Generate verification token and send email
      const verifyToken = generateToken();
      const verifyTtl = 24 * 60 * 60; // 24 hours
      await this.redis.hset(emailVerifyTokenKey(verifyToken), {
        userId: result.user.id,
      });
      await this.redis.expire(emailVerifyTokenKey(verifyToken), verifyTtl);
      const appUrl = this.config.get('WEB_URL', 'http://localhost:3000');
      const verifyLink = `${appUrl}/auth/verify-email?token=${verifyToken}`;
      const name = result.user.displayName
        ? String(result.user.displayName)
        : email.split('@')[0];
      const verifyHtml = `
      <div style="font-family: 'Arial', sans-serif; background-color: #0a0a15; color: #e2e8f0; padding: 40px 20px; border: 1px solid #1e1e3a; border-radius: 12px; max-width: 500px; margin: 0 auto; text-align: center;">
        <h2 style="color: #22d3ee; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Verify Your Email</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <span style="color: #fbbf24; font-weight: bold;">${name}</span>,</p>
        <p style="font-size: 14px; margin-bottom: 30px; color: #94a3b8; line-height: 1.5;">Thank you for registering to <strong>Borrowed Shapes</strong>. Please verify your email to activate your account:</p>
        <p>
          <a href="${verifyLink}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(90deg, #7c3aed, #06b6d4); background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">VERIFY EMAIL</a>
        </p>
        <p style="font-size: 12px; color: #64748b; margin-top: 30px; line-height: 1.5;">Or copy this link:<br/><a href="${verifyLink}" style="color: #22d3ee; word-break: break-all;">${verifyLink}</a></p>
        <p style="font-size: 12px; color: #64748b;">This link expires in 24 hours.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">If you didn't create this account, please safely ignore this email.</p>
      </div>
    `;

      await this.email.sendMail(
        email,
        '[Borrowed Shapes] Verify Your Email',
        verifyHtml,
      );

      return {
        userId: result.user.id,
        gameProfileId: result.gameProfile.id,
        email: String(result.user.email),
        displayName: result.user.displayName
          ? String(result.user.displayName)
          : null,
        role: result.user.role,
      };
    } catch (err) {
      if (err instanceof UniqueConstraintViolationException) {
        const e = err as UniqueConstraintViolationException & {
          constraint?: unknown;
          cause?: {
            constraint?: unknown;
            cause?: { constraint?: unknown };
            message?: string;
          };
        };

        const constraint = String(
          e.constraint ??
            e.cause?.constraint ??
            e.cause?.cause?.constraint ??
            '',
        );
        const details =
          `${constraint} ${err.message ?? ''} ${e.cause?.message ?? ''}`.toLowerCase();

        if (details.includes('user_email_key')) {
          throw new ConflictException('auth.email_in_use');
        }

        throw new ConflictException('auth.unique_field_in_use');
      }
      throw err;
    }
  }

  async login(
    dto: LoginRequestDto,
    ipAddress: string,
  ): Promise<LoginResponseDto> {
    if (!dto.email || !dto.password || !dto.platform) {
      throw new UnauthorizedException('auth.invalid_credentials');
    }

    const email = dto.email;
    const password = dto.password;
    const platform = dto.platform;

    const user = await this.em.findOne(User, { email });
    if (!user) throw new UnauthorizedException('auth.invalid_credentials');

    const gameProfile = await this.getOrCreateGameProfile(user);
    await ensureAccountActive(user, this.em);

    const valid = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!valid) throw new UnauthorizedException('auth.invalid_credentials');

    return this.issueLoginTokens(
      user,
      gameProfile,
      platform,
      dto.deviceInfo,
      ipAddress,
    );
  }

  async googleExchange(
    dto: GoogleExchangeRequestDto,
    ipAddress: string,
  ): Promise<GoogleExchangeResponseDto> {
    const expectedRedirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI');
    if (!expectedRedirectUri) {
      throw new BadRequestException('auth.google_not_configured');
    }

    if (dto.redirectUri !== expectedRedirectUri) {
      throw new BadRequestException('auth.invalid_redirect_uri');
    }

    const payload = await this.fetchGoogleUserInfo(
      dto.code,
      dto.codeVerifier,
      dto.redirectUri,
    );

    const { user, gameProfile } = await this.em.transactional(async (em) => {
      const googleId = String(payload.sub);
      const email = String(payload.email);
      const emailVerified = Boolean(payload.email_verified);
      const picture = payload.picture ? String(payload.picture) : null;
      const name = payload.name ? String(payload.name) : null;

      let found = await em.findOne(User, { googleId });
      if (!found) {
        found = await em.findOne(User, { email });
        if (found?.googleId && String(found.googleId) !== googleId) {
          throw new ConflictException('auth.email_already_linked');
        }
        if (found && !found.googleId) {
          found.googleId = googleId;
        }
      }

      const created = !found;

      const finalDisplayName = (
        name ? name.trim().replace(/\s+/g, ' ') : 'User'
      ).slice(0, 24);

      const user =
        found ??
        em.create(User, {
          email,
          googleId,
          imgUrl: picture,
          displayName: finalDisplayName,
          role: Role.USER,
          isBanned: false,
        });

      // Sync basic profile fields
      if (!created) {
        if (!user.email || String(user.email) !== email) {
          user.email = email as any;
        }
        if (picture && user.imgUrl !== picture) {
          user.imgUrl = picture;
        }
        if (!user.displayName && name) {
          user.displayName = name as any;
        }
      }

      // If account was created via Google and email is verified, keep it unbanned
      if (created) {
        if (!emailVerified) {
          // If Google did not verify email, be conservative
          user.isBanned = true as any;
          user.bannedAt = new Date();
          user.banReason = 'auth.unverified_email';
        } else {
          user.isBanned = false as any;
          user.bannedAt = undefined;
          user.banReason = undefined;
          user.banExpiresAt = undefined;
        }
      }

      await em.flush();

      let gameProfile = await em.findOne(GameProfile, { userId: user.id });
      if (!gameProfile) {
        gameProfile = em.create(GameProfile, { userId: user });
        await em.flush();
      }

      if (created) {
        const auditLog = em.create(AuditLog, {
          userId: user,
          actionType: AuditActionType.CREATE,
          entityName: 'User',
          entityId: user.id,
          newValue: {
            email: user.email,
            role: user.role,
            googleId: user.googleId,
          },
          ipAddress,
        });
        await em.flush();
        void auditLog;
      }

      return { user, gameProfile };
    });

    const ttl = parseDurationSeconds(
      this.config.get<string>('GOOGLE_LOGIN_CODE_TTL_SEC', '300'),
      300,
    );
    const loginCode = createId();
    await this.redis.hset(googleLoginCodeKey(loginCode), {
      userId: user.id,
      issuedAt: new Date().toISOString(),
    });
    await this.redis.expire(googleLoginCodeKey(loginCode), ttl);

    return {
      loginCode,
      user: this.toAuthUserResponse(user, gameProfile),
    };
  }

  async googleComplete(
    dto: GoogleCompleteRequestDto,
    ipAddress: string,
  ): Promise<GoogleCompleteResponseDto> {
    const record = await this.redis.hgetall(googleLoginCodeKey(dto.loginCode));
    if (!record?.userId) {
      throw new UnauthorizedException('auth.login_code_expired');
    }

    // One-time usage
    await this.redis.del(googleLoginCodeKey(dto.loginCode));

    const user = await this.em.findOne(User, { id: record.userId });
    if (!user) throw new UnauthorizedException('auth.user_not_found');

    const gameProfile = await this.getOrCreateGameProfile(user);
    await ensureAccountActive(user, this.em);

    return this.issueLoginTokens(
      user,
      gameProfile,
      dto.platform,
      dto.deviceInfo,
      ipAddress,
    );
  }

  async refresh(incomingRefreshToken: string): Promise<RefreshResponseDto> {
    // Parse: {userId}:{platform}:{sessionId}
    const firstColon = incomingRefreshToken.indexOf(':');
    const secondColon = incomingRefreshToken.indexOf(':', firstColon + 1);
    if (firstColon === -1 || secondColon === -1)
      throw new UnauthorizedException('auth.unauthorized');

    const userId = incomingRefreshToken.slice(0, firstColon);
    const platform = incomingRefreshToken.slice(firstColon + 1, secondColon);

    const stored = await this.redis.hgetall(rtKey(userId, platform));
    if (!stored) throw new UnauthorizedException('auth.unauthorized');

    if (stored.tokenHash !== hashToken(incomingRefreshToken))
      throw new UnauthorizedException('auth.unauthorized');
    if (new Date(stored.expiresAt) <= new Date()) {
      await this.redis.del(rtKey(userId, platform));
      throw new UnauthorizedException('auth.unauthorized');
    }

    if (stored.sessionId) {
      const dbSession = await this.em.findOne(
        UserSession,
        { sessionId: stored.sessionId, status: SessionStatus.ACTIVE },
        { fields: ['id'] },
      );
      if (!dbSession) {
        await this.redis.pipeline([
          { cmd: 'del', args: [rtKey(userId, platform)] },
          { cmd: 'zrem', args: [onlineZsetKey, stored.sessionId] },
          { cmd: 'del', args: [presenceDetailsKey(stored.sessionId)] },
        ]);
        throw new UnauthorizedException('auth.unauthorized');
      }
    }

    const user = await this.em.findOne(
      User,
      { id: userId },
      { fields: ['role', 'isBanned', 'bannedAt', 'banReason', 'banExpiresAt', 'deletedAt'] },
    );
    if (!user) throw new UnauthorizedException('auth.unauthorized');

    await ensureAccountActive(user as User, this.em);

    const sessionTtl = parseInt(
      this.config.get('SESSION_TTL_SEC', '604800'),
      10,
    );
    const accessTtl = parseInt(
      this.config.get('ACCESS_TOKEN_TTL_SEC', '900'),
      10,
    );
    const now = new Date().toISOString();

    // Rotate refresh token
    const newSessionId = createId();
    const newRefreshToken = `${userId}:${platform}:${newSessionId}`;
    const newTokenHash = hashToken(newRefreshToken);
    // Fetch gameProfile id for embedding in token
    const gpRecord = await this.em.findOne(
      GameProfile,
      { userId },
      { fields: ['id'] },
    );
    const gpId = gpRecord ? gpRecord.id : null;

    const newAccessToken = this.jwt.sign(
      {
        sub: userId,
        sid: newSessionId,
        role: user.role,
        pf: platform,
        gp: gpId,
      },
      { expiresIn: accessTtl },
    );

    const commands: Array<{ cmd: string; args: any[] }> = [];
    if (stored.sessionId) {
      commands.push({ cmd: 'zrem', args: [onlineZsetKey, stored.sessionId] });
      commands.push({
        cmd: 'del',
        args: [presenceDetailsKey(stored.sessionId)],
      });
    }
    commands.push(
      {
        cmd: 'hset',
        args: [
          rtKey(userId, platform),
          { tokenHash: newTokenHash, sessionId: newSessionId, lastActive: now },
        ],
      },
      { cmd: 'expire', args: [rtKey(userId, platform), sessionTtl] },
      {
        cmd: 'hset',
        args: [
          presenceDetailsKey(newSessionId),
          { userId, platform, lastActive: now },
        ],
      },
      { cmd: 'expire', args: [presenceDetailsKey(newSessionId), sessionTtl] },
      { cmd: 'zadd', args: [onlineZsetKey, Date.now(), newSessionId] },
    );
    await this.redis.pipeline(commands);

    // Update DB session record
    await this.em.nativeUpdate(
      UserSession,
      { sessionId: stored.sessionId, status: SessionStatus.ACTIVE },
      { sessionId: newSessionId },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: accessTtl,
    };
  }

  async logout(
    userId: string,
    platform: string,
    ipAddress: string,
  ): Promise<void> {
    const stored = await this.redis.hgetall(rtKey(userId, platform));

    await this.redis.del(rtKey(userId, platform));
    if (stored?.sessionId) {
      await this.redis.pipeline([
        { cmd: 'zrem', args: [onlineZsetKey, stored.sessionId] },
        { cmd: 'del', args: [presenceDetailsKey(stored.sessionId)] },
      ]);
    }

    try {
      const existingStatus = await this.em.findOne(UserOnlineStatus, {
        userId: this.em.getReference(User, userId),
      });
      if (existingStatus) {
        if (platform) {
          existingStatus.onlinePlatforms = existingStatus.onlinePlatforms.filter(p => p !== platform);
          if (existingStatus.onlinePlatforms.length === 0) {
            existingStatus.isOnline = false;
          }
        } else {
          existingStatus.isOnline = false;
          existingStatus.onlinePlatforms = [];
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to clear presence on logout for user ${userId}`);
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

  public async revokeUserSessions(
    userId: string,
    options?: { excludePlatform?: string },
  ): Promise<void> {
    const sessions = await this.em.find(
      UserSession,
      {
        userId: this.em.getReference(User, userId),
        status: SessionStatus.ACTIVE,
      },
      { fields: ['id', 'sessionId', 'platform'] },
    );

    if (sessions.length === 0) return;

    const now = new Date();

    for (const session of sessions) {
      if (
        options?.excludePlatform &&
        session.platform === options.excludePlatform
      ) {
        continue;
      }

      if (session.platform) {
        const key = rtKey(userId, session.platform);
        const stored = await this.redis.hgetall(key);
        if (stored?.sessionId === session.sessionId) {
          await this.redis.del(key);
        }
      }

      await this.redis.zrem(onlineZsetKey, session.sessionId);
      await this.redis.del(presenceDetailsKey(session.sessionId));

      try {
        const existingStatus = await this.em.findOne(UserOnlineStatus, {
          userId: this.em.getReference(User, userId),
        });
        if (existingStatus) {
          if (session.platform) {
            existingStatus.onlinePlatforms = existingStatus.onlinePlatforms.filter(p => p !== session.platform);
            if (existingStatus.onlinePlatforms.length === 0) {
              existingStatus.isOnline = false;
            }
          } else {
            existingStatus.isOnline = false;
            existingStatus.onlinePlatforms = [];
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to clear presence on revoke for user ${userId}`);
      }

      await this.em.nativeUpdate(
        UserSession,
        { id: session.id, status: SessionStatus.ACTIVE },
        { status: SessionStatus.REVOKED, logoutTime: now },
      );
    }
  }

  async verifyEmail(dto: VerifyEmailRequestDto): Promise<void> {
    const verificationRecord = await this.redis.hgetall(
      emailVerifyTokenKey(dto.token),
    );
    const userId = verificationRecord?.userId;
    if (!userId) {
      throw new BadRequestException('auth.verification_link_expired');
    }

    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new BadRequestException('auth.user_not_found');
    }

    // Unban user
    user.isBanned = false;
    user.bannedAt = undefined;
    user.banReason = undefined;
    user.banExpiresAt = undefined;
    await this.em.flush();

    // Clean up token
    await this.redis.del(emailVerifyTokenKey(dto.token));
  }

  async forgotPassword(dto: ForgotPasswordRequestDto): Promise<void> {
    const user = await this.em.findOne(User, { email: dto.email });
    if (!user) {
      // Don't leak that email exists or doesn't exist
      return;
    }

    // Generate OTP and store hashed value in Redis
    const otp = generateOtp(6);
    const otpHash = hashToken(otp);
    const otpTtl = parseInt(
      this.config.get('FORGOT_PASSWORD_OTP_TTL_SEC', '600'),
      10,
    );
    const key = forgotOtpKey(String(user.email));

    await this.redis.hset(key, { userId: user.id, otpHash });
    await this.redis.expire(key, otpTtl);

    // Send OTP email (compose template here; EmailService only sends)
    const name = user.displayName
      ? String(user.displayName)
      : String(user.email).split('@')[0];
    const otpHtml = `
      <div style="font-family: 'Arial', sans-serif; background-color: #0a0a15; color: #e2e8f0; padding: 40px 20px; border: 1px solid #1e1e3a; border-radius: 12px; max-width: 500px; margin: 0 auto; text-align: center;">
        <h2 style="color: #22d3ee; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 20px;">Password Reset Request</h2>
        <p style="font-size: 16px; margin-bottom: 20px;">Hello <span style="color: #fbbf24; font-weight: bold;">${name}</span>,</p>
        <p style="font-size: 14px; margin-bottom: 10px; color: #94a3b8; line-height: 1.5;">We received a request to reset your password for <strong>Borrowed Shapes</strong>.</p>
        <p style="font-size: 14px; margin-bottom: 30px; color: #94a3b8;">Your Verification Code is:</p>
        <div style="background-color: rgba(255, 255, 255, 0.05); border: 1px solid #7c3aed; padding: 20px; border-radius: 8px; margin: 0 auto; width: fit-content; box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);">
          <p style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #fbbf24; margin: 0; padding-left: 8px;">${otp}</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 30px;">This code expires in ${Math.ceil(otpTtl / 60)} minutes.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 20px;">If you didn't request this, please safely ignore this email.</p>
      </div>
    `;

    await this.email.sendMail(
      String(user.email),
      '[Borrowed Shapes] Forgot Password OTP',
      otpHtml,
    );
  }

  async resetPassword(dto: ResetPasswordRequestDto): Promise<void> {
    const key = forgotOtpKey(dto.email);
    const otpRecord = await this.redis.hgetall(key);
    if (!otpRecord?.userId || !otpRecord?.otpHash) {
      throw new UnauthorizedException('auth.otp_expired');
    }

    if (hashToken(dto.otp) !== otpRecord.otpHash) {
      throw new UnauthorizedException('auth.otp_expired');
    }

    const user = await this.em.findOne(User, { id: otpRecord.userId });
    if (!user) {
      throw new UnauthorizedException('auth.user_not_found');
    }

    // Check if new password is the same as current password
    if (user.passwordHash) {
      const isSameAsOld = await bcrypt.compare(
        dto.newPassword,
        user.passwordHash,
      );
      if (isSameAsOld) {
        throw new BadRequestException('auth.new_password_same_as_old');
      }
    }

    const rounds = parseInt(this.config.get('BCRYPT_ROUNDS', '10'), 10);
    user.passwordHash = await bcrypt.hash(dto.newPassword, rounds);
    await this.em.flush();

    await this.revokeUserSessions(String(user.id));

    // Clean up OTP
    await this.redis.del(key);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordRequestDto,
    currentPlatform?: string,
  ): Promise<void> {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new UnauthorizedException('auth.user_not_found');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('auth.password_not_set');
    }

    const valid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('auth.current_password_incorrect');
    }

    // Check if new password is the same as old password
    const isSameAsOld = await bcrypt.compare(
      dto.newPassword,
      user.passwordHash,
    );
    if (isSameAsOld) {
      throw new BadRequestException('auth.new_password_same_as_old');
    }

    const rounds = parseInt(this.config.get('BCRYPT_ROUNDS', '10'), 10);
    user.passwordHash = await bcrypt.hash(dto.newPassword, rounds);
    await this.em.flush();

    await this.revokeUserSessions(userId, { excludePlatform: currentPlatform });
  }

  /**
   * Return authenticated user's minimal profile and optional includes.
   * includeCsv: comma-separated list, e.g. 'achievements'
   */
  async me(userId: string, platform: string, includeCsv?: string) {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new UnauthorizedException('auth.user_not_found');

    const gameProfile = await this.em.findOne(
      GameProfile,
      { userId: user.id },
      { populate: ['equippedAchievementId'] },
    );

    const base = {
      id: user.id,
      gameProfileId: gameProfile ? gameProfile.id : null,
      email: String(user.email),
      displayName: user.displayName ? String(user.displayName) : null,
      imgUrl: getProxyAvatarUrl(user.imgUrl, user.id, user.updatedAt),
      role: user.role,
      isBanned: user.isBanned,
      bannedAt: user.bannedAt ? user.bannedAt.toISOString() : null,
      banReason: user.banReason ?? null,
      banExpiresAt: user.banExpiresAt ? user.banExpiresAt.toISOString() : null,
      equippedAchievementId: gameProfile?.equippedAchievementId
        ? {
            id: gameProfile.equippedAchievementId.id,
            name: gameProfile.equippedAchievementId.name,
            badgeImageUrl: gameProfile.equippedAchievementId.badgeImageUrl,
          }
        : null,
    };

    const result: any = { ...base };

    const includes = (includeCsv ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (includes.includes('gameProfile') && gameProfile) {
      result.gameProfile = {
        id: gameProfile.id,
        totalPlayTime: gameProfile.totalPlayTime,
        totalSessions: gameProfile.totalSessions,
        totalWins: gameProfile.totalWins,
        totalLosses: gameProfile.totalLosses,
        totalAbandoned: gameProfile.totalAbandoned,
      };
    }
    if (includes.includes('achievements') && gameProfile) {
      // load user's achievements (lightweight)
      const rows = await this.em.execute(
        `select ua."achievementId" as id, a.name, a."badgeImageUrl" as "badgeImageUrl", ua."achievedAt" as "achievedAt"
         from game."UserAchievement" ua
         join game."Achievement" a on a.id = ua."achievementId"
         where ua."gameProfileId" = ?`,
        [gameProfile.id],
      );

      result.achievements = (rows || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        badgeImageUrl: r.badgeImageUrl,
        achievedAt: r.achievedAt,
      }));
    }

    return result;
  }
}
