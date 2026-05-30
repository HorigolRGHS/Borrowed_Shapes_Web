import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AchievementController } from './achievements.controller';
import { AchievementService } from './achievements.service';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([Achievement, UserAchievement]),
    AuthModule,
  ],
  controllers: [AchievementController],
  providers: [AchievementService],
})
export class AchievementModule { }