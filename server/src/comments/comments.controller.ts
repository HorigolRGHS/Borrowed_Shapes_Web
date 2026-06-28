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
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentVoteDto } from './dto/vote.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) { }

  // Create a comment (authenticated)
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a comment or reply under a thread' })
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.commentsService.create(createCommentDto, user.userId);
    return okResponse('comments.create_success', data, 'POST /comments');
  }

  // Get comments list (public)
  @Get()
  @Public()
  @ApiOperation({ summary: 'List thread comments or replies' })
  async findComments(
    @Query('threadId') threadId: string,
    @Query('parentId') parentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const activeParentId = parentId && parentId.trim() !== '' ? parentId.trim() : null;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const data = await this.commentsService.findComments(
      threadId,
      activeParentId,
      pageNum,
      limitNum,
      user?.userId
    );

    console.log("Test controller");
    return okResponse('comments.list_success', data, 'GET /comments');
  }

  // Edit comment content (authenticated, author only)
  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update a comment content' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.commentsService.update(id, updateCommentDto, user.userId);
    return okResponse('comments.update_success', data, `PATCH /comments/${id}`);
  }

  // Soft delete a comment (authenticated, author or admin)
  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Soft delete a comment' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const isAdmin = user.role === 'ADMIN';
    const data = await this.commentsService.remove(id, user.userId, isAdmin);
    return okResponse('comments.delete_success', data, `DELETE /comments/${id}`);
  }

  // Vote on comment (authenticated)
  @Post(':id/vote')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vote (upvote/downvote) a comment' })
  async vote(
    @Param('id') id: string,
    @Body() dto: CommentVoteDto,
    @CurrentUser() user: RequestUser,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.commentsService.vote(id, user.userId, dto.value);
    return okResponse('comments.vote_success', data, `POST /comments/${id}/vote`);
  }
}
