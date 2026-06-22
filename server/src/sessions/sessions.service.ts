import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { RedisService } from '../redis/redis.service';
import { UserSession } from '../entities/UserSession';
import { AuditLog } from '../entities/AuditLog';
import { User } from '../entities/User';
import { SessionStatus } from '../entities/SessionStatus';
import { AuditActionType } from '../entities/AuditActionType';

import { UserSessionResponseDto, SessionMeResponseDto } from './dto/sessions.dto';

const PLATFORMS = ['game', 'web'] as const;
const rtKey = (userId: string, platform: string) => `rt:${userId}:${platform}`;
const presenceDetailsKey = (sessionId: string) => `user_session_details:${sessionId}`;
const onlineZsetKey = 'online_users_by_last_active';

@Injectable()
export class SessionsService {
  constructor(
    private em: EntityManager,
    private redis: RedisService,
  ) {}

  async getMe(userId: string, platform: string): Promise<SessionMeResponseDto> {
    const details = await this.redis.hgetall(rtKey(userId, platform));
    return { userId, platform, ...details };
  }

  async listSessions(userId: string, currentPlatform: string): Promise<UserSessionResponseDto[]> {
    // Read both platform slots in one pipeline
    const keys = PLATFORMS.map((p) => rtKey(userId, p));
    const liveResults = await this.redis.hgetallMany(keys);

    // Build active sessionId set from Redis
    const activeSessionIds = new Set<string>();
    const liveByPlatform = new Map<string, Record<string, string> | null>();
    PLATFORMS.forEach((p, i) => {
      liveByPlatform.set(p, liveResults[i]);
      if (liveResults[i]?.sessionId) activeSessionIds.add(liveResults[i]!.sessionId);
    });

    const dbSessions = await this.em.find(
      UserSession,
      { userId },
      { orderBy: { loginTime: 'desc' } },
    );

    return dbSessions.map((s) => {
      const isActive = activeSessionIds.has(s.sessionId);
      const live = isActive && s.platform ? (liveByPlatform.get(s.platform) ?? null) : null;
      return {
        id: s.id,
        userId: s.userId.id,
        sessionId: s.sessionId,
        platform: s.platform ?? '',
        loginTime: s.loginTime,
        logoutTime: s.logoutTime ?? null,
        deviceInfo: s.deviceInfo ?? null,
        ipAddress: (s.ipAddress as string) ?? null,
        status: s.status,
        isActive,
        isCurrent: isActive && s.platform === currentPlatform,
        lastActive: live?.lastActive ?? null,
      };
    });
  }

  async revoke(
    dbSessionId: string,
    requestUserId: string,
    requestUserRole: string,
    ipAddress: string,
  ): Promise<void> {
    const session = await this.em.findOne(UserSession, { id: dbSessionId });
    if (!session) throw new NotFoundException('auth.session_not_found');

    if (session.userId.id !== requestUserId && requestUserRole !== 'ADMIN') {
      throw new ForbiddenException('common.forbidden');
    }

    // Find which platform slot currently holds this session and remove it
    if (session.platform) {
      const key = rtKey(session.userId.id, session.platform);
      const stored = await this.redis.hgetall(key);
      if (stored?.sessionId === session.sessionId) {
        await this.redis.del(key);
      }
    }

    await this.redis.zrem(onlineZsetKey, session.sessionId);
    await this.redis.del(presenceDetailsKey(session.sessionId));

    await this.em.nativeUpdate(
      UserSession,
      { id: dbSessionId },
      { status: SessionStatus.REVOKED, logoutTime: new Date() },
    );

    const auditLog = this.em.create(AuditLog, {
      userId: this.em.getReference(User, requestUserId),
      actionType: AuditActionType.REVOKE_SESSION,
      entityName: 'UserSession',
      entityId: dbSessionId,
      ipAddress,
    });
    await this.em.flush();
    void auditLog;
  }
}
