import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameProfileRepository } from './repositories/game-profile.repository';
import { GameRunRepository } from './repositories/game-run.repository';
import { GameRunPlayerRepository } from './repositories/game-run-player.repository';
import { GameSessionRepository } from './repositories/game-session.repository';
import { GameSessionPlayerRepository } from './repositories/game-session-player.repository';
import { LevelRepository } from './repositories/level.repository';

@Module({
  controllers: [GameController],
  providers: [
    GameService,
    GameProfileRepository,
    GameRunRepository,
    GameRunPlayerRepository,
    GameSessionRepository,
    GameSessionPlayerRepository,
    LevelRepository,
  ],
  exports: [
    GameProfileRepository,
    GameRunRepository,
    GameRunPlayerRepository,
    GameSessionRepository,
    GameSessionPlayerRepository,
    LevelRepository,
  ]
})
export class GameModule {}
