import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { AnnouncementRepository } from './repositories/announcements.repository';

@Injectable()
export class AnnouncementPublishJob {
  private readonly logger = new Logger(AnnouncementPublishJob.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly announcementRepository: AnnouncementRepository,
  ) {}

  @Cron('* * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async publishScheduledAnnouncements(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      try {
        const count = await this.announcementRepository.publishScheduled();
        if (count > 0) {
          this.logger.log(
            `Automatically published ${count} scheduled announcements.`,
          );
        }
      } catch (err) {
        this.logger.error('Failed to run announcement auto-publish job', err);
      }
    });
  }
}
