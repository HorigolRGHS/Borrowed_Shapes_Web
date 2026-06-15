import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

import { AchievementService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievements.dto';
import { UpdateAchievementDto } from './dto/update-achievements.dto';
import { AchievementResponseDto } from './dto/achievements-response.dto';
import { UserAchievementResponseDto } from './dto/user-achievements-response.dto';
import { UnlockAchievementDto, UnlockAchievementResponseDto } from './dto/unlock-achievement.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Achievements')
// @UseGuards(AuthGuard)
@Roles('USER', 'ADMIN')
@Controller('achievements')
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
  ) { }

  @Get()
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all achievements (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'type', required: false, example: 'PERMANENT' })
  @ApiQuery({ name: 'q', required: false, example: 'win' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'name' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'], example: 'desc' })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('q') q?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    const result = await this.achievementService.findAllPaginated({
      page,
      limit,
      type,
      q,
      sortBy,
      order,
    });

    const data = {
      items: result.items.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        criteriaCode: a.criteriaCode,
        badgeImageUrl: a.badgeImageUrl,
        type: a.type,
        seasonMonth: a.seasonMonth,
        expiresAt: a.expiresAt,
        earnedCount: a.earnedCount,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };

    return okResponse(
      'achievements.list_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get('search')
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Search achievements (paginated)' })
  async search(
    @Query('q') q: string,
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    const result = await this.achievementService.findAllPaginated({
      page,
      limit,
      type,
      q,
      sortBy,
      order,
    });

    const data = {
      items: result.items.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        criteriaCode: a.criteriaCode,
        badgeImageUrl: a.badgeImageUrl,
        type: a.type,
        seasonMonth: a.seasonMonth,
        expiresAt: a.expiresAt,
        earnedCount: a.earnedCount,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };

    return okResponse(
      'achievements.search_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get('user/me')
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user achievements' })
  @ApiResponse({
    status: 200,
    type: [UserAchievementResponseDto],
  })
  async findByUser(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<UserAchievementResponseDto[]>> {
    if (!user.gameProfileId) {
      return okResponse(
        'achievements.users_success',
        [],
        `${req.method} ${req.path}`,
      );
    }

    const userAchievements =
      await this.achievementService.findByUser(
        user.gameProfileId,
      );

    const data = userAchievements.map((ua) => ({
      achievement: {
        id: ua.achievementId.id,
        name: ua.achievementId.name,
        description: ua.achievementId.description,
        criteriaCode: ua.achievementId.criteriaCode,
        badgeImageUrl: ua.achievementId.badgeImageUrl,
        type: ua.achievementId.type,
        seasonMonth: ua.achievementId.seasonMonth,
        expiresAt: ua.achievementId.expiresAt,
      },
      achievedAt: ua.achievedAt,
    }));

    return okResponse(
      'achievements.user_list_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get(':id/users')
  // @ApiBearerAuth()
  async findUsersByAchievement(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const users =
      await this.achievementService.findUsersByAchievement(id);

    return okResponse(
      'achievements.users_success',
      users,
      `${req.method} ${req.path}`,
    );
  }

  @Get(':id')
  // @ApiBearerAuth()
  @ApiOperation({ summary: 'Get achievement details' })
  @ApiResponse({
    status: 200,
    type: AchievementResponseDto,
  })
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AchievementResponseDto>> {
    const achievement = await this.achievementService.findOne(id);
    const data: AchievementResponseDto = {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      criteriaCode: achievement.criteriaCode,
      badgeImageUrl: achievement.badgeImageUrl,
      type: achievement.type,
      seasonMonth: achievement.seasonMonth,
      expiresAt: achievement.expiresAt,
      earnedCount: achievement.earnedCount,
    };

    return okResponse(
      'achievements.detail_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock achievement by criteria code' })
  @ApiBody({ type: UnlockAchievementDto })
  @ApiResponse({
    status: 200,
    type: UnlockAchievementResponseDto,
  })
  async unlock(
    @CurrentUser() user: RequestUser,
    @Body() dto: UnlockAchievementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<UnlockAchievementResponseDto>> {
    const data = await this.achievementService.unlock(user.gameProfileId, dto.criteriaCode);
    return okResponse('achievements.unlocked_success', data, `${req.method} ${req.path}`);
  }

  @Post()
  @Roles('ADMIN')
  // @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create achievement' })
  @ApiBody({ type: CreateAchievementDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAchievementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.achievementService.create(dto);
    return okResponse(
      'achievements.create_success',
      null,
      `${req.method} ${req.path}`,
    );
  }

  @Put(':id')
  // @ApiBearerAuth()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update achievement' })
  @ApiBody({ type: UpdateAchievementDto })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateAchievementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.achievementService.update(id, dto);
    return okResponse(
      'achievements.update_success',
      null,
      `${req.method} ${req.path}`,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  // @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete achievement' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.achievementService.delete(id);
    return okResponse(
      'achievements.delete_success',
      null,
      `${req.method} ${req.path}`,
    );
  }
}