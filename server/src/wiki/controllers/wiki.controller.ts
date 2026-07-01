import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { WikiService } from '../services/wiki.service';
import { WikiListQueryDto } from '../dto/wiki-list.dto';
import { WikiDetailRevisionDto } from '../dto/wiki-detail.dto';
import { WikiSearchQueryDto } from '../dto/wiki-search.dto';
import {
  WikiHistoryResponseDto,
  WikiRevisionDiffResponseDto,
} from '../dto/wiki-history.dto';
import { RelatedPageDto } from '../dto/wiki-metadata.dto';
import {
  WikiPublicListResponseDto,
  WikiPublicDetailDto,
} from '../dto/wiki-public.dto';
import { resolveLocale } from '../../common/utils/resolve-locale';
import { ApiResponseDto, okResponse } from '../../common/dto/api-response.dto';

@ApiTags('Wiki')
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description:
    "Locale for returned fields. 'vi*' → Vietnamese values under the same keys; anything else (or absent) → English.",
})
@Controller('wiki')
export class WikiController {
  constructor(private wikiService: WikiService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published wiki pages' })
  @ApiResponse({ status: 200, type: WikiPublicListResponseDto })
  async list(
    @Query() query: WikiListQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiPublicListResponseDto>> {
    const locale = resolveLocale(req.headers['accept-language']);
    const data = await this.wikiService.list(query, false, locale);
    return okResponse('wiki.list_success', data, `${req.method} ${req.path}`);
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search wiki pages by title' })
  @ApiResponse({ status: 200, type: WikiPublicListResponseDto })
  async search(
    @Query() query: WikiSearchQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiPublicListResponseDto>> {
    const locale = resolveLocale(req.headers['accept-language']);
    const data = await this.wikiService.search(query, false, locale);
    return okResponse('wiki.search_success', data, `${req.method} ${req.path}`);
  }

  @Public()
  @Get('related')
  @ApiOperation({ summary: 'Resolve related-page slugs to titles' })
  @ApiResponse({ status: 200, type: [RelatedPageDto] })
  async getRelatedTitles(
    @Query('slugs') slugs: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<RelatedPageDto[]>> {
    const list = (slugs ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const deduped = Array.from(new Set(list));
    if (deduped.length > 30) {
      throw new BadRequestException('wiki.too_many_related_slugs');
    }
    const data = await this.wikiService.findBySlugs(deduped);
    return okResponse(
      'wiki.related_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get published wiki by slug (en or vi)' })
  @ApiResponse({ status: 200, type: WikiPublicDetailDto })
  async getBySlug(
    @Param('slug') slug: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiPublicDetailDto>> {
    const locale = resolveLocale(req.headers['accept-language']);
    const data = await this.wikiService.getBySlug(slug, locale);
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
    const data = await this.wikiService.getHistory(
      id,
      Number(page),
      Number(limit),
    );
    return okResponse(
      'wiki.history_success',
      data,
      `${req.method} ${req.path}`,
    );
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
    return okResponse(
      'wiki.revision_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  @Roles('USER', 'ADMIN')
  @Get(':id/history/:revisionId/diff')
  @ApiOperation({
    summary: 'Diff this revision against the immediately preceding one',
  })
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
