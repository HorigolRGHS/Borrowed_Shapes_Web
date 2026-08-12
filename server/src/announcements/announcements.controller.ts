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
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { AnnouncementService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import {
  ListAnnouncementsQueryDto,
  AnnouncementPublicListResponseDto,
  AnnouncementPublicDetailDto,
  AnnouncementAdminListResponseDto,
  AnnouncementAdminDetailDto,
} from './dto/announcements-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { getClientIp } from '../common/utils/client-ip.util';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) { }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published announcements (no content)' })
  @ApiResponse({ status: 200, type: AnnouncementPublicListResponseDto })
  async findAll(
    @Query() query: ListAnnouncementsQueryDto,
    @Headers('accept-language') lang: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementPublicListResponseDto>> {
    const data = await this.announcementService.findAllPublic(
      query,
      lang?.toLowerCase().startsWith('vi') ? 'vi' : 'en',
    );
    return okResponse(
      'announcements.list_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Roles('ADMIN')
  @Get('admin')
  @ApiOperation({
    summary:
      'Admin: List all announcements (including drafts/scheduled, no content)',
  })
  @ApiResponse({ status: 200, type: AnnouncementAdminListResponseDto })
  async findAllAdmin(
    @Query() query: ListAnnouncementsQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementAdminListResponseDto>> {
    const data = await this.announcementService.findAllAdmin(query);
    return okResponse(
      'announcements.list_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get published announcement details by slug' })
  @ApiResponse({ status: 200, type: AnnouncementPublicDetailDto })
  async findOne(
    @Param('slug') slug: string,
    @Headers('accept-language') lang: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementPublicDetailDto>> {
    const data = await this.announcementService.findOnePublic(
      slug,
      lang?.toLowerCase().startsWith('vi') ? 'vi' : 'en',
    );
    return okResponse(
      'announcements.detail_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Roles('ADMIN')
  @Get('admin/:id')
  @ApiOperation({
    summary: 'Admin: Get full details of any announcement by ID',
  })
  @ApiResponse({ status: 200, type: AnnouncementAdminDetailDto })
  async findOneAdmin(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AnnouncementAdminDetailDto>> {
    const data = await this.announcementService.findOneAdmin(id);
    return okResponse(
      'announcements.detail_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create announcement' })
  @ApiBody({ type: CreateAnnouncementDto })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAnnouncementDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const data = await this.announcementService.create(dto, user.userId, getClientIp(req));
    return okResponse(
      'announcements.create_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Put(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update announcement' })
  @ApiBody({ type: UpdateAnnouncementDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    const data = await this.announcementService.update(id, dto, user.userId, getClientIp(req));
    return okResponse(
      'announcements.update_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete announcement' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.announcementService.delete(id, user.userId, getClientIp(req));
    return okResponse(
      'announcements.delete_success',
      null,
      `${req.method} ${req.path}`,
    );
  }
}
