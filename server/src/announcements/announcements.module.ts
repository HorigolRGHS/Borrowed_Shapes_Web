import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AnnouncementController } from './announcements.controller';
import { AnnouncementService } from './announcements.service';
import { Announcement } from '../entities/Announcement';
import { User } from '../entities/User';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Announcement, User]),
    AuthModule,
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
