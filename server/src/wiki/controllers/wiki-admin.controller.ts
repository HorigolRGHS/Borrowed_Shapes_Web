import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { WikiService } from '../services/wiki.service';
import { WikiRevisionService } from '../services/wiki-revision.service';
import { WikiListQueryDto, WikiListResponseDto } from '../dto/wiki-list.dto';
import { WikiDetailResponseDto } from '../dto/wiki-detail.dto';
import { WikiCreateRequestDto } from '../dto/wiki-create.dto';
import { WikiUpdateRequestDto } from '../dto/wiki-update.dto';
import { WikiRollbackRequestDto } from '../dto/wiki-rollback.dto';
import { ApiResponseDto, okResponse } from '../../common/dto/api-response.dto';

@ApiTags('wiki-admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('wiki')
export class WikiAdminController {
  constructor(
    private wikiService: WikiService,
    private revisionService: WikiRevisionService,
  ) {}

  @Get('admin')
  @ApiOperation({ summary: 'Admin: list all wiki pages including drafts' })
  @ApiResponse({ status: 200, type: WikiListResponseDto })
  async list(
    @Query() query: WikiListQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiListResponseDto>> {
    const data = await this.wikiService.list(query, true);
    return okResponse('wiki.list_success', data, `${req.method} ${req.path}`);
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Admin: get wiki page by id (any state) for editing' })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async getById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.wikiService.getByIdForAdmin(id);
    return okResponse('wiki.detail_success', data, `${req.method} ${req.path}`);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create wiki page + first revision' })
  @ApiResponse({ status: 201, type: WikiDetailResponseDto })
  async create(
    @Body() dto: WikiCreateRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.create(dto, user.userId, req.ip ?? '');
    return okResponse('wiki.created', data, `${req.method} ${req.path}`);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: update wiki page; new revision when content changes' })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: WikiUpdateRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.update(id, dto, user.userId, req.ip ?? '');
    return okResponse('wiki.updated', data, `${req.method} ${req.path}`);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard-delete wiki page; cascades revisions' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.revisionService.delete(id, user.userId, req.ip ?? '');
    return okResponse('wiki.deleted', null, `${req.method} ${req.path}`);
  }

  @Post(':id/rollback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: rollback to a target revision (creates new revision)' })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async rollback(
    @Param('id') id: string,
    @Body() dto: WikiRollbackRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.rollback(id, dto, user.userId, req.ip ?? '');
    return okResponse('wiki.rolled_back', data, `${req.method} ${req.path}`);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: publish wiki page' })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.publish(id, user.userId, req.ip ?? '');
    return okResponse('wiki.published', data, `${req.method} ${req.path}`);
  }

  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: unpublish wiki page' })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async unpublish(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.unpublish(id, user.userId, req.ip ?? '');
    return okResponse('wiki.unpublished', data, `${req.method} ${req.path}`);
  }
}
