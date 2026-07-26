import { Module, forwardRef } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthRateLimitGuard } from '../common/guards/auth-rate-limit.guard';
import { EmailModule } from '../email/email.module';
import { GameModule } from '../game/game.module';
import { PresenceModule } from '../presence/presence.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UserRepository } from './repositories/user.repository';
import { AuditModule } from '../audit/audit.module';
import { AutoUnbanJob } from './auto-unban.job';

@Module({
  imports: [
    EmailModule,
    GameModule,
    PresenceModule,
    AuditModule,
    forwardRef(() => SessionsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me-in-production'),
        signOptions: {
          expiresIn: config.get<number>('ACCESS_TOKEN_TTL_SEC', 900),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    AuthRateLimitGuard,
    { provide: APP_GUARD, useExisting: AuthGuard },
    UserRepository,
    AutoUnbanJob,
  ],
  exports: [AuthGuard, JwtModule, AuthService, UserRepository],
})
export class AuthModule {}
