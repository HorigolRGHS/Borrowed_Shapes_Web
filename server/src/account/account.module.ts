import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PresenceModule } from '../presence/presence.module';
import { AchievementModule } from '../achievements/achievements.module';
import { GameModule } from '../game/game.module';
import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AccountRepository } from './repositories/account.repository';
import { StorageModule } from '../storage/storage.module';
import { EmailModule } from '../email/email.module';
import { User } from '../entities/User';
import { GameProfile } from '../entities/GameProfile';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { AuditLog } from '../entities/AuditLog';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      User,
      GameProfile,
      Achievement,
      UserAchievement,
      AuditLog,
    ]),
    StorageModule,
    EmailModule,
    AuthModule,
    GameModule,
    AchievementModule,
    PresenceModule,
  ],
  controllers: [AccountController],
  providers: [AccountService, AccountRepository],
  exports: [AccountService, AccountRepository],
})
export class AccountModule {}
