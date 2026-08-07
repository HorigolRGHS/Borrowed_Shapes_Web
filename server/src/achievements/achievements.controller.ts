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
  BadRequestException,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

import { AchievementService } from './achievements.service';
import { CreateAchievementDto } from './dto/create-achievements.dto';
import { UpdateAchievementDto } from './dto/update-achievements.dto';
import {
  AchievementResponseDto,
  AchievementUploadResponseDto,
} from './dto/achievements-response.dto';
import { UserAchievementResponseDto } from './dto/user-achievements-response.dto';
import {
  UnlockAchievementDto,
  UnlockAchievementResponseDto,
} from './dto/unlock-achievement.dto';
import { AchievementUploadUrlDto } from './dto/achievement-upload-url.dto';
import { AchievementConfirmUploadDto } from './dto/achievement-confirm-upload.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { getProxyMediaUrl } from '../storage/media-utils';
import { getClientIp } from '../common/utils/client-ip.util';

@ApiTags('Achievements')
@Roles('USER', 'ADMIN')
@Controller('achievements')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get('admin/check-next-month')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Check if top 5 achievements for next month are created' })
  async checkNextMonthTopAchievements(@Req() req: Request) {
    const hasAll = await this.achievementService.checkNextMonthTopAchievements();
    return okResponse('Checked achievements', { hasAll }, req.url);
  }

  @Get()
  @ApiOperation({ summary: 'Get all achievements (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'type', required: false, example: 'PERMANENT' })
  @ApiQuery({ name: 'q', required: false, example: 'win' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'name' })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
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
        badgeImageUrl: getProxyMediaUrl(a.badgeImageUrl) ?? '',
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
        badgeImageUrl: getProxyMediaUrl(a.badgeImageUrl) ?? '',
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

    const userAchievements = await this.achievementService.findByUser(
      user.gameProfileId,
    );

    const data = userAchievements.map((ua) => ({
      achievement: {
        id: ua.achievementId.id,
        name: ua.achievementId.name,
        description: ua.achievementId.description,
        criteriaCode: ua.achievementId.criteriaCode,
        badgeImageUrl: getProxyMediaUrl(ua.achievementId.badgeImageUrl) ?? '',
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

  @Get('user/me/showcase')
  @ApiOperation({
    summary: 'Get achievement showcase for current user profile',
  })
  async findShowcase(@CurrentUser() user: RequestUser, @Req() req: Request) {
    if (!user.gameProfileId) {
      return okResponse(
        'achievements.showcase_success',
        {
          permanent: [],
          seasonal: [],
          stats: { totalEarned: 0, permanentEarned: 0, seasonalEarned: 0 },
        },
        `${req.method} ${req.path}`,
      );
    }

    const data = await this.achievementService.findShowcaseForUser(
      user.gameProfileId,
    );

    return okResponse(
      'achievements.showcase_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Get(':id/users')
  async findUsersByAchievement(@Param('id') id: string, @Req() req: Request) {
    const users = await this.achievementService.findUsersByAchievement(id);

    return okResponse(
      'achievements.users_success',
      users,
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
      badgeImageUrl: getProxyMediaUrl(achievement.badgeImageUrl) as string,
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
    if (!user.gameProfileId) {
      throw new BadRequestException('User does not have a game profile');
    }
    const data = await this.achievementService.unlock(
      user.gameProfileId,
      dto.criteriaCode,
    );
    return okResponse(
      'achievements.unlocked_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Post('admin/upload-url')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Admin: create a presigned upload URL for achievement badge',
  })
  @ApiBody({ type: AchievementUploadUrlDto })
  async createUploadUrl(
    @Body() dto: AchievementUploadUrlDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.achievementService.createUploadUrl(dto);
    return okResponse(
      'achievements.upload_url_created',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Post('admin/confirm-upload')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Admin: confirm badge image upload and update achievement',
  })
  @ApiBody({ type: AchievementConfirmUploadDto })
  @ApiResponse({ status: 200, type: AchievementUploadResponseDto })
  async confirmUpload(
    @Body() dto: AchievementConfirmUploadDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AchievementUploadResponseDto>> {
    const data = await this.achievementService.confirmUpload(dto);
    return okResponse(
      'achievements.uploaded',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create achievement' })
  @ApiBody({ type: CreateAchievementDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAchievementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.achievementService.create(dto, user.userId, getClientIp(req));
    return okResponse(
      'achievements.create_success',
      null,
      `${req.method} ${req.path}`,
    );
  }

  @Put(':id')
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
    await this.achievementService.update(id, dto, user.userId, getClientIp(req));
    return okResponse(
      'achievements.update_success',
      null,
      `${req.method} ${req.path}`,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete achievement' })
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.achievementService.delete(id, user.userId, getClientIp(req));
    return okResponse(
      'achievements.delete_success',
      null,
      `${req.method} ${req.path}`,
    );
  }
}
