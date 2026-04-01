import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { PresenceService } from './presence.service';

@Injectable()
export class PresenceSyncJob {
  private readonly logger = new Logger(PresenceSyncJob.name);

  constructor(
    private readonly orm: MikroORM,
    private presenceService: PresenceService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpired(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      try {
        await this.presenceService.cleanupExpiredSessions();
      } catch (err) {
        this.logger.error('Redis cleanup job failed', err);
      }
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async syncToDb(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      try {
        await this.presenceService.syncOnlineStatusToDb();
      } catch (err) {
        this.logger.error('DB sync job failed', err);
      }
    });
  }
}
