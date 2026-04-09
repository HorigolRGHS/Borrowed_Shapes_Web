import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { RedisService } from '../redis/redis.service';
import { UserSession } from '../entities/UserSession';
import { UserOnlineStatus } from '../entities/UserOnlineStatus';
import { User } from '../entities/User';
import { SessionStatus } from '../entities/SessionStatus';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private redis: RedisService,
    private em: EntityManager,
    private config: ConfigService,
  ) {}

  async cleanupExpiredSessions(): Promise<void> {
    const timeoutMs = this.config.get<number>('HEARTBEAT_TIMEOUT_MS', 120000);
    const cutoff = Date.now() - timeoutMs;

    const expired = await this.redis.zrangebyscore('online_users_by_last_active', 0, cutoff);
    if (expired.length === 0) return;

    this.logger.debug(`Cleaning up ${expired.length} expired sessions`);

    for (const sessionId of expired) {
      const details = await this.redis.hgetall(`user_session_details:${sessionId}`);
      await this.redis.del(`user_session_details:${sessionId}`);
      await this.redis.zrem('online_users_by_last_active', sessionId);

      if (details?.userId) {
        await this.redis.del(`session:${details.userId}:${sessionId}`);
        await this.em.nativeUpdate(
          UserSession,
          { sessionId, status: SessionStatus.ACTIVE },
          { status: SessionStatus.EXPIRED, logoutTime: new Date() },
        );
      }
    }
  }

  async syncOnlineStatusToDb(): Promise<void> {
    const raw = await this.redis.zrangeWithScores('online_users_by_last_active');

    // raw = [sessionId, score, sessionId, score, ...]
    const userMap = new Map<string, { platforms: Set<string>; lastActive: number }>();

    for (let i = 0; i < raw.length; i += 2) {
      const sessionId = raw[i];
      const score = parseInt(raw[i + 1], 10);
      const details = await this.redis.hgetall(`user_session_details:${sessionId}`);
      if (!details?.userId) continue;

      const entry = userMap.get(details.userId) ?? { platforms: new Set<string>(), lastActive: 0 };
      if (details.platform) entry.platforms.add(details.platform);
      entry.lastActive = Math.max(entry.lastActive, score);
      userMap.set(details.userId, entry);
    }

    for (const [userId, { platforms, lastActive }] of userMap) {
      await this.em.upsert(UserOnlineStatus, {
        userId: this.em.getReference(User, userId),
        isOnline: true,
        lastOnline: new Date(lastActive),
        onlinePlatforms: Array.from(platforms),
      });
    }

    const onlineIds = Array.from(userMap.keys());
    await this.em.nativeUpdate(
      UserOnlineStatus,
      { userId: { $nin: onlineIds }, isOnline: true },
      { isOnline: false },
    );
  }
}
