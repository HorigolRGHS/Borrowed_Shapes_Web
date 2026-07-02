import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { GameProfile } from '../entities/GameProfile';
import { getEffectiveExpiresAt } from './achievements.service';

@Injectable()
export class AchievementsCleanupJob {
  private readonly logger = new Logger(AchievementsCleanupJob.name);

  constructor(private readonly orm: MikroORM) {}

  @Cron('0 * * * * *') // Run once every minute
  async cleanupExpiredAchievements(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      try {
        const profiles = await this.orm.em.find(
          GameProfile,
          { equippedAchievementId: { $ne: null } },
          { populate: ['equippedAchievementId'] },
        );

        let unequippedCount = 0;
        const now = new Date();

        for (const gp of profiles) {
          const ach = gp.equippedAchievementId;
          if (ach) {
            const expiresAt = getEffectiveExpiresAt(ach.type, ach.seasonMonth, ach.expiresAt);
            if (ach.type === 'SEASONAL' && expiresAt && expiresAt < now) {
              gp.equippedAchievementId = undefined as any;
              unequippedCount++;
            }
          }
        }

        if (unequippedCount > 0) {
          await this.orm.em.flush();
          this.logger.log(`Automatically unequipped ${unequippedCount} expired seasonal achievements.`);
        }
      } catch (err) {
        this.logger.error('Failed to run achievements cleanup job', err);
      }
    });
  }
}
