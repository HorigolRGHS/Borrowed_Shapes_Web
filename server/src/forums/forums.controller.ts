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
} from '@nestjs/common';
import { ForumService } from './forums.service';
import { CreateForumDto } from './dto/create-forums.dto';
import { UpdateForumDto } from './dto/update-forums.dto';
import { ListForumsDto } from './dto/list-forums.dto';
import { VoteDto } from './dto/vote.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Forum')
@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) { }

  // List threads (public)
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List forum threads',
    description: 'Thread `content` is a ~100-character plaintext preview (markdown stripped). Full content is available via GET /forum/:id.',
  })
  async findAll(
    @Query() query: ListForumsDto,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.forumService.list(query);
    return okResponse('forum.list_success', data, 'GET /forum');
  }

  // Get thread detail (public)
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get forum thread detail',
  })
  @ApiParam({
    name: 'id',
    description: 'Thread ID',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.forumService.findOne(id);
    return okResponse('forum.detail_success', data, `GET /forum/${id}`);
  }

  // Create thread (requires auth)
  @Post()
  @ApiOperation({
    summary: 'Create a forum thread',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createForumDto: CreateForumDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const isAdmin = user.role === 'ADMIN';
    await this.forumService.create(createForumDto, user.userId, isAdmin);
    return okResponse('forum.create_success', null, 'POST /forum');
  }

  // Update thread (requires auth, author only)
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
  ): Promise<ApiResponseDto<any>> {
    const isAdmin = user.role === 'ADMIN';
    await this.forumService.update(id, updateForumDto, user.userId, isAdmin);
    return okResponse('forum.update_success', null, `PATCH /forum/${id}`);
  }

  // Delete thread (requires auth, author or admin)
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
    return okResponse('forum.delete_success', null, `DELETE /forum/${id}`);
  }

  // Vote on thread (requires auth, value = 1 | -1)
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
    return okResponse('forum.vote_success', data, `POST /forum/${id}/vote`);
  }
}