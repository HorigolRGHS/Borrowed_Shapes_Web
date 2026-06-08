import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { GameResultService } from './game-results.service';
import {
  ListGameResultsQueryDto,
  LeaderboardQueryDto,
  GameResultListResponseDto,
  GameResultDetailResponseDto,
  LeaderboardResponseDto,
} from './dto/game-results-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Game-results')
@UseGuards(AuthGuard)
@Roles('ADMIN')
@ApiBearerAuth()
@Controller('game-results')
export class GameResultController {
  constructor(private readonly gameResultService: GameResultService) { }

  @Get()
  @ApiOperation({ summary: 'List game results (paginated)' })
  @ApiResponse({ status: 200, type: GameResultListResponseDto })
  async findAll(
    @Query() query: ListGameResultsQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<GameResultListResponseDto>> {
    const data = await this.gameResultService.findAllPaginated(query);
    return okResponse(
      'game_results.list_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get('user/me')
  @ApiOperation({ summary: 'Get current user play history' })
  @ApiResponse({ status: 200, type: GameResultListResponseDto })
  async findMyHistory(
    @CurrentUser() user: RequestUser,
    @Query() query: ListGameResultsQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<GameResultListResponseDto>> {
    if (!user.gameProfileId) {
      const empty: GameResultListResponseDto = {
        items: [],
        total: 0,
        page: 1,
        limit: query.limit ?? 10,
        totalPages: 1,
      };
      return okResponse(
        'game_results.list_success',
        empty,
        `${req.method} ${req.path}`,
      );
    }

    const data = await this.gameResultService.findByUser(
      user.gameProfileId,
      query,
    );
    return okResponse(
      'game_results.list_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get('leaderboard')
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'View leaderboard (fastest completed runs)' })
  @ApiResponse({ status: 200, type: LeaderboardResponseDto })
  async getLeaderboard(
    @Query() query: LeaderboardQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<LeaderboardResponseDto>> {
    const data = await this.gameResultService.getLeaderboard(query);
    return okResponse(
      'game_results.leaderboard_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get game result details' })
  @ApiResponse({ status: 200, type: GameResultDetailResponseDto })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<GameResultDetailResponseDto>> {
    const data = await this.gameResultService.findOne(id);
    return okResponse(
      'game_results.detail_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete game result' })
  @ApiResponse({ status: 200 })
  async delete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.gameResultService.delete(id);
    return okResponse(
      'game_results.delete_success',
      null,
      `${req.method} ${req.path}`,
    );
  }
}
