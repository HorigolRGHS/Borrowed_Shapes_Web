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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentVoteDto } from './dto/vote.dto';
import { AuthGuard } from '../auth/auth.guard';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { getClientIp } from '../common/utils/client-ip.util';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';
import { RateLimit } from '../common/decorators/rate-limit.decorator';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(AuthGuard, RateLimitGuard)
  @RateLimit('CREATE_COMMENT', 10, 60)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a comment or reply under a thread' })
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.commentsService.create(
      createCommentDto,
      user.userId,
      getClientIp(req),
    );
    return okResponse('comments.create_success', data, 'POST /comments');
  }

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
    const activeParentId =
      parentId && parentId.trim() !== '' ? parentId.trim() : null;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const data = await this.commentsService.findComments(
      threadId,
      activeParentId,
      pageNum,
      limitNum,
      user?.userId,
    );
    return okResponse('comments.list_success', data, 'GET /comments');
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update a comment content' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.commentsService.update(
      id,
      updateCommentDto,
      user.userId,
      getClientIp(req),
    );
    return okResponse('comments.update_success', data, `PATCH /comments/${id}`);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Soft delete a comment' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const isAdmin = user.role === 'ADMIN';
    const data = await this.commentsService.remove(id, user.userId, isAdmin, getClientIp(req));
    return okResponse(
      'comments.delete_success',
      data,
      `DELETE /comments/${id}`,
    );
  }

  @Post(':id/vote')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vote (upvote/downvote) a comment' })
  async vote(
    @Param('id') id: string,
    @Body() dto: CommentVoteDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.commentsService.vote(id, user.userId, dto.value, getClientIp(req));
    return okResponse(
      'comments.vote_success',
      data,
      `POST /comments/${id}/vote`,
    );
  }
}
