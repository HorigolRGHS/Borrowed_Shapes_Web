import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ConfigModule } from '@nestjs/config';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Report } from '../entities/Report';
import { ReportMedia } from '../entities/ReportMedia';
import { ReportResponse } from '../entities/ReportResponse';
import { User } from '../entities/User';
import { ForumThread } from '../entities/ForumThread';
import { ForumComment } from '../entities/ForumComment';
import { GameProfile } from '../entities/GameProfile';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      Report,
      ReportMedia,
      ReportResponse,
      User,
      ForumThread,
      ForumComment,
      GameProfile,
    ]),
    AuthModule,
    StorageModule,
    ConfigModule,
    EmailModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
