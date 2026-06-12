import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Announcement } from '../entities/Announcement';

@Injectable()
export class AnnouncementsPublishJob {
  private readonly logger = new Logger(AnnouncementsPublishJob.name);

  constructor(private readonly orm: MikroORM) {}

  @Cron('* * * * *')
  async publishScheduled(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      try {
        const em = this.orm.em as EntityManager;
        const now = new Date();

        const scheduled = await em.find(Announcement, {
          isPublished: false,
          publishedAt: { $lte: now },
        });

        if (scheduled.length === 0) return;

        for (const announcement of scheduled) {
          announcement.isPublished = true;
        }

        await em.flush();
        this.logger.log(`Auto-published ${scheduled.length} announcement(s)`);
      } catch (err) {
        this.logger.error('Announcement auto-publish job failed', err);
      }
    });
  }
}
