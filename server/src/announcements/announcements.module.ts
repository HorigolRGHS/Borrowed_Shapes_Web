import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { AnnouncementController } from './announcements.controller';
import { AnnouncementService } from './announcements.service';
import { AnnouncementPublishJob } from './announcement-publish.job';
import { AnnouncementRepository } from './repositories/announcements.repository';

import { Announcement } from '../entities/Announcement';
import { User } from '../entities/User';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Announcement, User]),
    AuthModule,
    AuditModule,
  ],
  controllers: [AnnouncementController],
  providers: [
    AnnouncementService,
    AnnouncementPublishJob,
    AnnouncementRepository,
  ],
  exports: [AnnouncementService, AnnouncementRepository],
})
export class AnnouncementModule {}
