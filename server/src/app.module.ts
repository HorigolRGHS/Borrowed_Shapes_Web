import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { SessionsModule } from './sessions/sessions.module';
import { PresenceModule } from './presence/presence.module';
import { GameModule } from './game/game.module';
import { AchievementModule } from './achievements/achievements.module';
import { I18nModule } from './common/i18n/i18n.module';
import { HeartbeatInterceptor } from './common/interceptors/heartbeat.interceptor';
import { SeasonTeamModule } from './season-team/season-team.module';
import { WikiModule } from './wiki/wiki.module';
import { ForumModule } from './forums/forums.module';
import { CategoryModule } from './categories/categories.module';
import { AnnouncementModule } from './announcements/announcements.module';
import mikroOrmConfig from './mikro-orm.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    RedisModule,
    AuthModule,
    SessionsModule,
    PresenceModule,
    GameModule,
    AchievementModule,
    I18nModule,
    SeasonTeamModule,
    WikiModule,
    ForumModule,
    CategoryModule,
    AnnouncementModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HeartbeatInterceptor,
    },
  ],
})
export class AppModule { }
