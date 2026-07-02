import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ForumService } from './forums.service';
import { CreateForumDto } from './dto/create-forums.dto';
import { UpdateForumDto } from './dto/update-forums.dto';
import { ListForumsDto } from './dto/list-forums.dto';
import { VoteDto } from './dto/vote.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { resolveLocale } from '../common/utils/resolve-locale';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import {
  ThreadImageUploadRequestDto,
  ThreadImageUploadResponseDto,
} from './dto/thread-image-upload.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Forum')
@Controller('forums')
export class ForumController {
  constructor(
    private readonly forumService: ForumService,
  ) { }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List forum threads',
    description: 'Thread `content` is a ~100-character',
  })
  async findAll(
    @Query() query: ListForumsDto,
    @CurrentUser() user?: RequestUser,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ApiResponseDto<any>> {
    const locale = resolveLocale(acceptLanguage);
    const data = await this.forumService.list(query, user, locale);
    return okResponse('forums.list_success', data, 'GET /forums');
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get forum thread detail by slug' })
  @ApiParam({ name: 'slug', description: 'Thread slug' })
  async findOneBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user?: RequestUser,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ApiResponseDto<any>> {
    const locale = resolveLocale(acceptLanguage);
    const data = await this.forumService.findOneBySlug(slug, locale, user);
    return okResponse('forums.detail_success', data, `GET /forums/slug/${slug}`);
  }

  @Roles('ADMIN')
  @Get('id/:id')
  @ApiOperation({
    summary: 'Get forum thread detail by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Thread ID',
  })
  async findOneById(
    @Param('id') id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ApiResponseDto<any>> {
    const locale = resolveLocale(acceptLanguage);
    const data = await this.forumService.findOneById(id, locale);
    return okResponse('forums.detail_success', data, `GET /forums/id/${id}`);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a forum thread',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createForumDto: CreateForumDto,
    @CurrentUser() user: RequestUser,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ApiResponseDto<any>> {
    const locale = resolveLocale(acceptLanguage);
    const isAdmin = user.role === 'ADMIN';
    const newThread = await this.forumService.create(createForumDto, user.userId, isAdmin, locale);
    return okResponse('forums.create_success', newThread, 'POST /forums');
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a forum thread',
  })
  @ApiParam({
    name: 'id',
    description: 'Thread ID',
  })
  async update(
    @Param('id') id: string,
    @Body() updateForumDto: UpdateForumDto,
    @CurrentUser() user: RequestUser,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ApiResponseDto<any>> {
    const isAdmin = user.role === 'ADMIN';
    const locale = resolveLocale(acceptLanguage);
    await this.forumService.update(id, updateForumDto, user.userId, isAdmin, locale);
    return okResponse('forums.update_success', null, `PATCH /forums/${id}`);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a forum thread',
  })
  @ApiParam({
    name: 'id',
    description: 'Thread ID',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const isAdmin = user.role === 'ADMIN';
    await this.forumService.remove(id, user.userId, isAdmin);
    return okResponse('forums.delete_success', null, `DELETE /forums/${id}`);
  }

  @Post(':id/vote')
  @ApiOperation({
    summary: 'Vote a forum thread',
  })
  @ApiParam({
    name: 'id',
    description: 'Thread ID',
  })
  @HttpCode(HttpStatus.OK)
  async vote(
    @Param('id') id: string,
    @Body() dto: VoteDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.forumService.vote(id, user.userId, dto.value);
    return okResponse('forums.vote_success', data, `POST /forums/${id}/vote`);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Create presigned upload URL for forum thread image' })
  async uploadThreadImage(
    @Body() dto: ThreadImageUploadRequestDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<ThreadImageUploadResponseDto>> {
    if (!user?.userId) {
      throw new ForbiddenException('forums.unauthenticated');
    }

    const data = await this.forumService.uploadThreadImage(dto, user.userId);
    return okResponse(
      'forums.thread_image_upload_url_created',
      data,
      'POST /forums/upload',
    );
  }
}