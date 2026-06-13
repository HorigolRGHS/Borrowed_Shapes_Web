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

import { AnnouncementService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import {
  ListAnnouncementsQueryDto,
  AnnouncementResponseDto,
  AnnouncementListResponseDto,
} from './dto/announcements-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Announcements')
// @UseGuards(AuthGuard)
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published announcements' })
  @ApiResponse({ status: 200, type: AnnouncementListResponseDto })
  async findAll(
    @Query() query: ListAnnouncementsQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementListResponseDto>> {
    const data = await this.announcementService.findAllPaginated(query, false);
    return okResponse('announcements.list_success', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  // @ApiBearerAuth()
  @Get('admin')
  @ApiOperation({ summary: 'Admin: List all announcements (including drafts/scheduled)' })
  @ApiResponse({ status: 200, type: AnnouncementListResponseDto })
  async findAllAdmin(
    @Query() query: ListAnnouncementsQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementListResponseDto>> {
    const data = await this.announcementService.findAllPaginated(query, true);
    return okResponse('announcements.list_success', data, `${req.method} ${req.path}`);
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get published announcement details by ID or Slug' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  async findOne(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementResponseDto>> {
    const data = await this.announcementService.findOne(idOrSlug, false);
    return okResponse('announcements.detail_success', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  // @ApiBearerAuth()
  @Get('admin/:id')
  @ApiOperation({ summary: 'Admin: Get details of any announcement by ID' })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  async findOneAdmin(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementResponseDto>> {
    const data = await this.announcementService.findOne(id, true);
    return okResponse('announcements.detail_success', data, `${req.method} ${req.path}`);
  }

  @Post()
  @Roles('ADMIN')
  // @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create announcement' })
  @ApiBody({ type: CreateAnnouncementDto })
  @ApiResponse({ status: 201, type: AnnouncementResponseDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAnnouncementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementResponseDto>> {
    const data = await this.announcementService.create(dto, user.userId);
    return okResponse('announcements.create_success', data, `${req.method} ${req.path}`);
  }

  @Put(':id')
  @Roles('ADMIN')
  // @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update announcement' })
  @ApiBody({ type: UpdateAnnouncementDto })
  @ApiResponse({ status: 200, type: AnnouncementResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementResponseDto>> {
    const data = await this.announcementService.update(id, dto);
    return okResponse('announcements.update_success', data, `${req.method} ${req.path}`);
  }

  @Delete(':id')
  @Roles('ADMIN')
  // @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete announcement' })
  @ApiResponse({ status: 200 })
  async delete(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.announcementService.delete(id);
    return okResponse('announcements.delete_success', null, `${req.method} ${req.path}`);
  }
}
