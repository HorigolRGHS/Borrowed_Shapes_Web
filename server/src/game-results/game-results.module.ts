import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { GameResultController } from './game-results.controller';
import { GameResultService } from './game-results.service';
import { GameRun } from '../entities/GameRun';
import { GameRunPlayer } from '../entities/GameRunPlayer';
import { GameSession } from '../entities/GameSession';
import { GameSessionPlayer } from '../entities/GameSessionPlayer';
import { GameProfile } from '../entities/GameProfile';
import { User } from '../entities/User';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([
      GameRun,
      GameRunPlayer,
      GameSession,
      GameSessionPlayer,
      GameProfile,
      User,
    ]),
    AuthModule,
  ],
  controllers: [GameResultController],
  providers: [GameResultService],
  exports: [GameResultService],
})
export class GameResultModule {}
