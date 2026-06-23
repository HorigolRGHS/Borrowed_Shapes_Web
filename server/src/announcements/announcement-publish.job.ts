import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { Announcement } from '../entities/Announcement';

@Injectable()
export class AnnouncementPublishJob {
  private readonly logger = new Logger(AnnouncementPublishJob.name);

  constructor(private readonly orm: MikroORM) {}

  @Cron('* * * * *')
  async publishScheduledAnnouncements(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      try {
        const count = await this.orm.em.nativeUpdate(
          Announcement,
          {
            isPublished: false,
            publishedAt: { $ne: null, $lte: new Date() },
          },
          {
            isPublished: true,
          },
        );
        if (count > 0) {
          this.logger.log(`Automatically published ${count} scheduled announcements.`);
        }
      } catch (err) {
        this.logger.error('Failed to run announcement auto-publish job', err);
      }
    });
  }
}
