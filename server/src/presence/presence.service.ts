import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { RedisService } from '../redis/redis.service';
import { UserOnlineStatus } from '../entities/UserOnlineStatus';
import { User } from '../entities/User';

import { UserOnlineStatusRepository } from './repositories/user-online-status.repository';

const presenceDetailsKey = (sessionId: string) =>
  `user_session_details:${sessionId}`;
const onlineZsetKey = 'online_users_by_last_active';

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private redis: RedisService,
    private em: EntityManager,
    private config: ConfigService,
    private userOnlineStatusRepository: UserOnlineStatusRepository,
  ) {}

  async touchOnline(
    userId: string,
    platform: string,
    sessionId?: string,
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    if (sessionId) {
      await this.redis.pipeline([
        {
          cmd: 'hset',
          args: [
            presenceDetailsKey(sessionId),
            { userId, platform, lastActive: nowIso },
          ],
        },
        { cmd: 'zadd', args: [onlineZsetKey, nowMs, sessionId] },
      ]);
    }

    const existing = await this.userOnlineStatusRepository.findOne({
      userId: this.em.getReference(User, userId),
    });

    const platforms = new Set(existing?.onlinePlatforms || []);
    if (platform) platforms.add(platform);

    await this.userOnlineStatusRepository.upsert({
      userId: this.em.getReference(User, userId),
      isOnline: true,
      lastOnline: new Date(nowMs),
      onlinePlatforms: Array.from(platforms),
    });
    await this.userOnlineStatusRepository.flush();
  }

  async cleanupExpiredSessions(): Promise<void> {
    const timeoutMs = this.config.get<number>('HEARTBEAT_TIMEOUT_MS', 60000);
    const cutoff = Date.now() - timeoutMs;

    const expired = await this.redis.zrangebyscore(onlineZsetKey, 0, cutoff);
    if (expired.length === 0) return;

    this.logger.debug(`Cleaning up ${expired.length} expired sessions`);

    for (const sessionId of expired) {
      await this.redis.del(presenceDetailsKey(sessionId));
      await this.redis.zrem(onlineZsetKey, sessionId);
    }
  }

  async syncOnlineStatusToDb(): Promise<void> {
    const raw = await this.redis.zrangeWithScores(onlineZsetKey);

    // raw = [sessionId, score, sessionId, score, ...]
    const userMap = new Map<
      string,
      { platforms: Set<string>; lastActive: number }
    >();

    for (let i = 0; i < raw.length; i += 2) {
      const sessionId = raw[i];
      const score = parseInt(raw[i + 1], 10);
      const details = await this.redis.hgetall(presenceDetailsKey(sessionId));
      if (!details?.userId) continue;

      const entry = userMap.get(details.userId) ?? {
        platforms: new Set<string>(),
        lastActive: 0,
      };
      if (details.platform) entry.platforms.add(details.platform);
      entry.lastActive = Math.max(entry.lastActive, score);
      userMap.set(details.userId, entry);
    }

    for (const [userId, { platforms, lastActive }] of userMap) {
      await this.userOnlineStatusRepository.upsert({
        userId: this.em.getReference(User, userId),
        isOnline: true,
        lastOnline: new Date(lastActive),
        onlinePlatforms: Array.from(platforms),
      });
    }

    const onlineIds = Array.from(userMap.keys());
    await this.userOnlineStatusRepository.setOfflineForUsersNotIn(onlineIds);
  }

  async listAllPresence(): Promise<any[]> {
    const statuses = await this.userOnlineStatusRepository.find(
      { isOnline: true },
      { populate: ['userId'] as any },
    );
    return statuses.map((s) => ({
      userId: s.userId.id,
      email: s.userId.email,
      displayName: s.userId.displayName,
      role: s.userId.role,
      isOnline: s.isOnline,
      lastOnline: s.lastOnline,
      onlinePlatforms: s.onlinePlatforms || [],
    }));
  }

  async getUserPresence(userId: string): Promise<any> {
    const status = await this.userOnlineStatusRepository.findOne(
      { userId: this.em.getReference(User, userId) },
      { populate: ['userId'] as any },
    );
    if (!status) {
      return { userId, isOnline: false, lastOnline: null, onlinePlatforms: [] };
    }
    return {
      userId: status.userId.id,
      email: status.userId.email,
      displayName: status.userId.displayName,
      role: status.userId.role,
      isOnline: status.isOnline,
      lastOnline: status.lastOnline,
      onlinePlatforms: status.onlinePlatforms || [],
    };
  }
}
