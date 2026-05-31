import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ForumService } from './forums.service';
import { CreateForumDto } from './dto/create-forums.dto';
import { UpdateForumDto } from './dto/update-forums.dto';
import { ListForumsDto } from './dto/list-forums.dto';
import { VoteDto } from './dto/vote.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  // List threads (public)
  @Public()
  @Get()
  async findAll(
    @Query() query: ListForumsDto,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.forumService.list(query);
    return okResponse('forum.list_success', data, 'GET /forum');
  }

  // Get thread detail (public)
  @Public()
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.forumService.findOne(id);
    return okResponse('forum.detail_success', data, `GET /forum/${id}`);
  }

  // Create thread (requires auth)
  @UseGuards(AuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createForumDto: CreateForumDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.forumService.create(createForumDto, user.userId);
    return okResponse('forum.create_success', data, 'POST /forum');
  }

  // Update thread (requires auth, author only)
  @UseGuards(AuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateForumDto: UpdateForumDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.forumService.update(id, updateForumDto, user.userId);
    return okResponse('forum.update_success', data, `PATCH /forum/${id}`);
  }

  // Delete thread (requires auth, author or admin)
  @UseGuards(AuthGuard)
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const isAdmin = user.role === 'ADMIN';
    const data = await this.forumService.remove(id, user.userId, isAdmin);
    return okResponse('forum.delete_success', data, `DELETE /forum/${id}`);
  }

  // Vote on thread (requires auth, value = 1 | -1)
  @UseGuards(AuthGuard)
  @Post(':id/vote')
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