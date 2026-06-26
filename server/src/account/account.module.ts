import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { StorageModule } from '../storage/storage.module';
import { EmailModule } from '../email/email.module';
import { User } from '../entities/User';
import { GameProfile } from '../entities/GameProfile';
import { Achievement } from '../entities/Achievement';
import { UserAchievement } from '../entities/UserAchievement';
import { AuditLog } from '../entities/AuditLog';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, GameProfile, Achievement, UserAchievement, AuditLog]),
    StorageModule,
    EmailModule,
    AuthModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
