import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AchievementController } from './achievements.controller';
import { AchievementService } from './achievements.service';
import { AchievementsCleanupJob } from './achievements-cleanup.job';
import { AchievementsCheckJob } from './achievements-check.job';
import { AchievementRepository } from './repositories/achievements.repository';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { GameProfile } from '../entities/GameProfile';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Achievement, UserAchievement, GameProfile]),
    AuthModule,
    StorageModule,
    AuditModule,
    EmailModule,
  ],
  controllers: [AchievementController],
  providers: [
    AchievementService,
    AchievementsCleanupJob,
    AchievementsCheckJob,
    AchievementRepository,
  ],
  exports: [AchievementService, AchievementRepository],
})
export class AchievementModule {}
