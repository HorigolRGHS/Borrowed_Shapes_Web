import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { GameService } from './game.service';
import { EndRunRequestDto, InitGameRunRequestDto, RunIdResponseDto } from './dto/game-run.dto';
import { JoinLobbyRequestDto } from './dto/join-lobby.dto';
import { StartSessionRequestDto, SessionIdResponseDto } from './dto/start-session.dto';
import { EndSessionRequestDto } from './dto/end-session.dto';
import { LeaveLobbyParamsRequestDto } from './dto/leave-lobby.dto';
import { ApiResponseDto } from '../common/dto/api-response.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('run/init')
  async initRun(
    @CurrentUser() user: RequestUser,
    @Body() dto: InitGameRunRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RunIdResponseDto>> {
    const path = `${req.method} ${req.path}`;
    return this.gameService.initRun(user.userId, dto, path);
  }

  @Post('lobby/join')
  async joinLobby(
    @CurrentUser() user: RequestUser,
    @Body() dto: JoinLobbyRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RunIdResponseDto>> {
    const path = `${req.method} ${req.path}`;
    return this.gameService.joinLobby(user.userId, dto, path);
  }

  @Post('session/start')
  async startSession(
    @Body() dto: StartSessionRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<SessionIdResponseDto>> {
    const path = `${req.method} ${req.path}`;
    return this.gameService.startSession(dto, path);
  }

  @Post('session/end')
  async endSession(
    @Body() dto: EndSessionRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const path = `${req.method} ${req.path}`;
    return this.gameService.endSession(dto, path);
  }

  @Post('run/end')
  async endRun(
    @Body() dto: EndRunRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const path = `${req.method} ${req.path}`;
    return this.gameService.endRun(dto, path);
  }

  @Post('lobby/:lobbyId/leave')
  async leaveLobby(
    @CurrentUser() user: RequestUser,
    @Param() params: LeaveLobbyParamsRequestDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const path = `${req.method} ${req.path}`;
    return this.gameService.leaveLobby(user.userId, params.lobbyId, path);
  }
}
