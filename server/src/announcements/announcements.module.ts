import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ScheduleModule } from '@nestjs/schedule';
import { AnnouncementController } from './announcements.controller';
import { AnnouncementService } from './announcements.service';
import { AnnouncementsPublishJob } from './announcements-publish.job';
import { Announcement } from '../entities/Announcement';
import { User } from '../entities/User';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Announcement, User]),
    ScheduleModule.forRoot(),
    AuthModule,
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService, AnnouncementsPublishJob],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
