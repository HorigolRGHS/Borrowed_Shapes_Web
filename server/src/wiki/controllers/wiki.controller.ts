import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  StreamableFile,
  UseFilters,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { WikiService } from '../services/wiki.service';
import { WikiRevisionService } from '../services/wiki-revision.service';
import { WikiListQueryDto, WikiListResponseDto } from '../dto/wiki-list.dto';
import {
  WikiDetailResponseDto,
  WikiDetailRevisionDto,
} from '../dto/wiki-detail.dto';
import { WikiCreateRequestDto } from '../dto/wiki-create.dto';
import { WikiUpdateRequestDto } from '../dto/wiki-update.dto';
import { WikiRollbackRequestDto } from '../dto/wiki-rollback.dto';
import { WikiAdminStatsDto } from '../dto/wiki-admin-stats.dto';
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
import { WikiUploadResponseDto } from '../dto/wiki-upload.dto';
import { UPLOAD_MAX_SIZE } from '../dto/wiki-constants';
import { resolveLocale } from '../../common/utils/resolve-locale';
import { ApiResponseDto, okResponse } from '../../common/dto/api-response.dto';
import { MulterExceptionFilter } from './multer-exception.filter';

@ApiTags('Wiki')
@ApiHeader({
  name: 'Accept-Language',
  required: false,
  description:
    "Locale for returned fields. 'vi*' → Vietnamese values under the same keys; anything else (or absent) → English.",
})
@Controller('wiki')
export class WikiController {
  constructor(
    private wikiService: WikiService,
    private revisionService: WikiRevisionService,
  ) {}

  // ---- Public / user reads (literal-prefixed GETs first) ----

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
    return okResponse('wiki.related_success', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Get('admin')
  @ApiOperation({ summary: 'Admin: list all wiki pages including drafts' })
  @ApiResponse({ status: 200, type: WikiListResponseDto })
  async adminList(
    @Query() query: WikiListQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiListResponseDto>> {
    const data = await this.wikiService.list(query, true);
    return okResponse('wiki.list_success', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Get('admin/stats')
  @ApiOperation({ summary: 'Admin: wiki statistics' })
  @ApiResponse({ status: 200, type: WikiAdminStatsDto })
  async stats(@Req() req: Request): Promise<ApiResponseDto<WikiAdminStatsDto>> {
    const data = await this.wikiService.getAdminStats();
    return okResponse('wiki.stats_success', data, `${req.method} ${req.path}`);
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

  @Public()
  @Get('image/*key')
  @ApiOperation({ summary: 'Public: stream wiki image through backend proxy' })
  async image(
    @Param('key') keyParam: string | string[],
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const key = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;
    const { stream, contentType, contentLength } =
      await this.revisionService.streamImage(key);
    res.set({
      'Content-Type': contentType,
      'Content-Length': contentLength,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    return new StreamableFile(stream);
  }

  @Roles('ADMIN')
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

  // ---- Admin writes ----

  @Roles('ADMIN')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: create wiki page + first revision' })
  @ApiResponse({ status: 201, type: WikiDetailResponseDto })
  async create(
    @Body() dto: WikiCreateRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.create(
      dto,
      user.userId,
      req.ip ?? 'unknown',
    );
    return okResponse('wiki.created', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Post(':wikiId/upload')
  @UseFilters(MulterExceptionFilter)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: UPLOAD_MAX_SIZE, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Admin: upload an image (jpeg/png/webp/gif, max 5MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, type: WikiUploadResponseDto })
  async upload(
    @Param('wikiId') wikiId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiUploadResponseDto>> {
    const data = await this.revisionService.uploadImage(
      wikiId,
      file,
      user.userId,
      req.ip ?? '',
    );
    return okResponse('wiki.uploaded', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Post(':id/rollback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: rollback to a target revision (creates new revision)',
  })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async rollback(
    @Param('id') id: string,
    @Body() dto: WikiRollbackRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.rollback(
      id,
      dto,
      user.userId,
      req.ip ?? 'unknown',
    );
    return okResponse('wiki.rolled_back', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: publish wiki page' })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.publish(
      id,
      user.userId,
      req.ip ?? 'unknown',
    );
    return okResponse('wiki.published', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: unpublish wiki page' })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async unpublish(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.unpublish(
      id,
      user.userId,
      req.ip ?? 'unknown',
    );
    return okResponse('wiki.unpublished', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin: update wiki page; new revision when content changes',
  })
  @ApiResponse({ status: 200, type: WikiDetailResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: WikiUpdateRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiDetailResponseDto>> {
    const data = await this.revisionService.update(
      id,
      dto,
      user.userId,
      req.ip ?? 'unknown',
    );
    return okResponse('wiki.updated', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: hard-delete wiki page; cascades revisions' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<null>> {
    await this.revisionService.delete(id, user.userId, req.ip ?? 'unknown');
    return okResponse('wiki.deleted', null, `${req.method} ${req.path}`);
  }
}
