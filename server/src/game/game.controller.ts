import { Body, Controller, Logger, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { GameService } from './game.service';
import { InitGameRunDto } from './dto/init-game-run.dto';
import { JoinLobbyDto } from './dto/join-lobby.dto';
import { StartSessionDto } from './dto/start-session.dto';
import { EndSessionDto } from './dto/end-session.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import { RunIdResponseDto, SessionIdResponseDto } from './dto/game-response.dto';

@Controller('game')
export class GameController {
  private readonly logger = new Logger(GameController.name);

  constructor(private readonly gameService: GameService) {}

  @Post('run/init')
  async initRun(
    @CurrentUser() user: RequestUser,
    @Body() dto: InitGameRunDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RunIdResponseDto>> {
    const path = `${req.method} ${req.path}`;
    this.logger.log(`POST /api/game/run/init body=${JSON.stringify(dto)}`);
    const response = await this.gameService.initRun(user.userId, dto, path);
    this.logger.log(`POST /api/game/run/init runId=${response.data.runId}`);
    return response;
  }

  @Post('lobby/join')
  async joinLobby(
    @CurrentUser() user: RequestUser,
    @Body() dto: JoinLobbyDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RunIdResponseDto>> {
    const path = `${req.method} ${req.path}`;
    this.logger.log(`POST /api/game/lobby/join body=${JSON.stringify(dto)}`);
    const response = await this.gameService.joinLobby(user.userId, dto, path);
    this.logger.log(`POST /api/game/lobby/join runId=${response.data.runId}`);
    return response;
  }

  @Post('session/start')
  async startSession(
    @Body() dto: StartSessionDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<SessionIdResponseDto>> {
    const path = `${req.method} ${req.path}`;
    this.logger.log(`POST /api/game/session/start body=${JSON.stringify(dto)}`);
    const response = await this.gameService.startSession(dto, path);
    this.logger.log(`POST /api/game/session/start sessionId=${response.data.sessionId}`);
    return response;
  }

  @Post('session/end')
  async endSession(
    @Body() dto: EndSessionDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const path = `${req.method} ${req.path}`;
    this.logger.log(`POST /api/game/session/end body=${JSON.stringify(dto)}`);
    const response = await this.gameService.endSession(dto, path);
    this.logger.log(`POST /api/game/session/end completed`);
    return response;
  }

  @Post('lobby/:lobbyId/leave')
  async leaveLobby(
    @CurrentUser() user: RequestUser,
    @Param('lobbyId') lobbyId: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const path = `${req.method} ${req.path}`;
    this.logger.log(`POST /api/game/lobby/${lobbyId}/leave body={}`);
    const response = await this.gameService.leaveLobby(user.userId, lobbyId, path);
    this.logger.log(`POST /api/game/lobby/${lobbyId}/leave completed`);
    return response;
  }
}
