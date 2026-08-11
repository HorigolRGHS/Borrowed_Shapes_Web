import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseDto } from '../common/dto/api-response.dto';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { SeasonTeamService } from './season-team.service';
import { CreateSeasonTeamDto } from './dto/create-season-team.dto';
import { JoinSeasonTeamDto } from './dto/join-season-team.dto';
import { KickSeasonTeamMemberDto } from './dto/kick-season-team-member.dto';
import { SeasonTeamResponseDto } from './dto/season-team-response.dto';

@ApiTags('Season Team')
@Controller('season-team')
export class SeasonTeamController {
  constructor(private readonly seasonTeamService: SeasonTeamService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a season team for the current month' })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSeasonTeamDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<SeasonTeamResponseDto>> {
    const path = `${req.method} ${req.path}`;
    return this.seasonTeamService.createTeam(user.userId, dto, path);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a season team by code' })
  async join(
    @CurrentUser() user: RequestUser,
    @Body() dto: JoinSeasonTeamDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<SeasonTeamResponseDto>> {
    const path = `${req.method} ${req.path}`;
    return this.seasonTeamService.joinTeam(user.userId, dto, path);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get my current season team' })
  async getMyTeam(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<SeasonTeamResponseDto | null>> {
    const path = `${req.method} ${req.path}`;
    return this.seasonTeamService.getMyTeam(user.userId, path);
  }

  @Post(':teamId/kick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kick a member from my season team' })
  async kickMember(
    @CurrentUser() user: RequestUser,
    @Param('teamId') teamId: string,
    @Body() dto: KickSeasonTeamMemberDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const path = `${req.method} ${req.path}`;
    return this.seasonTeamService.kickMember(user.userId, teamId, dto, path);
  }

  @Post('leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Leave my current season team' })
  async leave(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const path = `${req.method} ${req.path}`;
    return this.seasonTeamService.leaveTeam(user.userId, path);
  }

  @Delete(':teamId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete my season team' })
  async deleteTeam(
    @CurrentUser() user: RequestUser,
    @Param('teamId') teamId: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const path = `${req.method} ${req.path}`;
    return this.seasonTeamService.deleteTeam(user.userId, teamId, path);
  }
}
