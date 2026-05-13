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
} from '@nestjs/common';

import type { Request } from 'express';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

import { AchievementService } from './achievement.service';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { UpdateAchievementDto } from './dto/update-achievement.dto';
import { AchievementResponseDto } from './dto/achievement-response.dto';
import { UserAchievementResponseDto } from './dto/user-achievement-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('achievements')
@UseGuards(AuthGuard)
@Roles('USER', 'ADMIN')
@Controller('achievements')
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all achievements' })
  @ApiResponse({
    status: 200,
    type: [AchievementResponseDto],
  })
  async findAll(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AchievementResponseDto[]>> {
    const achievements = await this.achievementService.findAll();
    const data = achievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      criteriaCode: a.criteriaCode,
      badgeImageUrl: a.badgeImageUrl,
      type: a.type,
      seasonMonth: a.seasonMonth,
      expiresAt: a.expiresAt,
    }));
    return okResponse(
      'achievements.list_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search achievements' })
  @ApiResponse({
    status: 200,
    type: [AchievementResponseDto],
  })
  async search(
    @CurrentUser() user: RequestUser,
    @Query('q') query: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AchievementResponseDto[]>> {
    const achievements = await this.achievementService.search(query);
    const data = achievements.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      criteriaCode: a.criteriaCode,
      badgeImageUrl: a.badgeImageUrl,
      type: a.type,
      seasonMonth: a.seasonMonth,
      expiresAt: a.expiresAt,
    }));

    return okResponse(
      'achievements.search_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get('user/me')
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
        'achievements.user_list_success',
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

  @Get(':id')
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
    };

    return okResponse(
      'achievements.detail_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create achievement' })
  @ApiBody({ type: CreateAchievementDto })
  @ApiResponse({
    status: 201,
    type: AchievementResponseDto,
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAchievementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AchievementResponseDto>> {
    const achievement =
      await this.achievementService.create(dto);

    const data: AchievementResponseDto = {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      criteriaCode: achievement.criteriaCode,
      badgeImageUrl: achievement.badgeImageUrl,
      type: achievement.type,
      seasonMonth: achievement.seasonMonth,
      expiresAt: achievement.expiresAt,
    };

    return okResponse(
      'achievements.create_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Put(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update achievement' })
  @ApiBody({ type: UpdateAchievementDto })
  @ApiResponse({
    status: 200,
    type: AchievementResponseDto,
  })
  async update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateAchievementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AchievementResponseDto>> {
    const achievement =
      await this.achievementService.update(id, dto);

    const data: AchievementResponseDto = {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      criteriaCode: achievement.criteriaCode,
      badgeImageUrl: achievement.badgeImageUrl,
      type: achievement.type,
      seasonMonth: achievement.seasonMonth,
      expiresAt: achievement.expiresAt,
    };

    return okResponse(
      'achievements.update_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete achievement' })
  @ApiResponse({ status: 200 })
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