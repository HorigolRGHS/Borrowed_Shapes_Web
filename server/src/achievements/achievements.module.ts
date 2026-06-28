import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AchievementController } from './achievements.controller';
import { AchievementService } from './achievements.service';
import { AchievementsCleanupJob } from './achievements-cleanup.job';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Achievement, UserAchievement]),
    AuthModule,
    StorageModule,
  ],
  controllers: [AchievementController],
  providers: [AchievementService, AchievementsCleanupJob],
  exports: [AchievementService],
})
export class AchievementModule { }