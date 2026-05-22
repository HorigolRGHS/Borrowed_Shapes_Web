import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { WikiService } from '../services/wiki.service';
import { WikiListQueryDto, WikiListResponseDto } from '../dto/wiki-list.dto';
import { WikiDetailResponseDto, WikiDetailRevisionDto } from '../dto/wiki-detail.dto';
import { WikiSearchQueryDto } from '../dto/wiki-search.dto';
import {
  WikiHistoryResponseDto,
  WikiRevisionDiffResponseDto,
} from '../dto/wiki-history.dto';
import { ApiResponseDto, okResponse } from '../../common/dto/api-response.dto';

@ApiTags('wiki')
@Controller('wiki')
export class WikiController {
  constructor(private wikiService: WikiService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published wiki pages' })
  @ApiResponse({ status: 200, type: WikiListResponseDto })
  async list(
    @Query() query: WikiListQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiListResponseDto>> {
    const data = await this.wikiService.list(query, false);
    return okResponse('wiki.list_success', data, `${req.method} ${req.path}`);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search wiki pages by title' })
  @ApiResponse({ status: 200, type: WikiListResponseDto })
  async search(
    @Query() query: WikiSearchQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiListResponseDto>> {
    const data = await this.wikiService.search(query, false);
    return okResponse('wiki.search_success', data, `${req.method} ${req.path}`);
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get published wiki by slug (en or vi)' })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async getBySlug(
    @Param('slug') slug: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.wikiService.getBySlug(slug);
    return okResponse('wiki.detail_success', data, `${req.method} ${req.path}`);
  }

  @Roles('USER', 'ADMIN')
  @Get(':id/history')
  @ApiOperation({ summary: 'List revisions of a wiki page' })
  @ApiResponse({ status: 200, type: WikiHistoryResponseDto })
  async history(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiHistoryResponseDto>> {
    const data = await this.wikiService.getHistory(id, Number(page), Number(limit));
    return okResponse('wiki.history_success', data, `${req.method} ${req.path}`);
  }

  @Roles('USER', 'ADMIN')
  @Get(':id/history/:revisionId')
  @ApiOperation({ summary: 'Get full content of a single revision' })
  @ApiResponse({ status: 200, type: WikiDetailRevisionDto })
  async getRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<unknown>> {
    const data = await this.wikiService.getRevision(id, revisionId);
    return okResponse('wiki.revision_success', data, `${req.method} ${req.path}`);
  }

  @Roles('USER', 'ADMIN')
  @Get(':id/history/:revisionId/diff')
  @ApiOperation({ summary: 'Diff this revision against the immediately preceding one' })
  @ApiResponse({ status: 200, type: WikiRevisionDiffResponseDto })
  async getRevisionDiff(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiRevisionDiffResponseDto>> {
    const data = await this.wikiService.getRevisionDiff(id, revisionId);
    return okResponse('wiki.diff_success', data, `${req.method} ${req.path}`);
  }
}
