import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ForumThread } from '../entities/ForumThread';
import { ForumCategory } from '../entities/ForumCategory';
import { User } from '../entities/User';
import { ForumThreadVote } from '../entities/ForumThreadVote';
import { CreateForumDto } from './dto/create-forums.dto';
import { UpdateForumDto } from './dto/update-forums.dto';

@Injectable()
export class ForumService {
  constructor(private readonly em: EntityManager) {}

  // List: pagination + search + category + sort
  async list({ page = 1, limit = 20, q = '', categoryId, sort = 'recent' }: any) {
    const offset = (page - 1) * limit;
    const clauses: string[] = [];
    const params: any[] = [];

    // Search with ILIKE (case-insensitive)
    if (q && q.trim()) {
      clauses.push(`(title ilike ? or content ilike ?)`);
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm);
    }

    if (categoryId) {
      clauses.push(`"categoryId" = ?`);
      params.push(categoryId);
    }

    const where = clauses.length ? `where ${clauses.join(' and ')}` : '';

    const order =
      sort === 'top'
        ? `order by "score" desc, "createdAt" desc`
        : `order by "createdAt" desc`;

    const rows = await this.em.execute(
      `
      select t.*, u."displayName" as "authorName", u."imgUrl" as "authorAvatar",
             c."name" as "categoryName", c."slug" as "categorySlug"
      from web."ForumThread" t
      inner join auth."User" u on u."id" = t."authorId"
      inner join web."ForumCategory" c on c."id" = t."categoryId"
      ${where}
      ${order}
      limit ? offset ?
      `,
      [...params, limit, offset],
    );

    const countRes = await this.em.execute(
      `select count(1) as cnt from web."ForumThread" t ${where}`,
      params,
    );

    const total = Number(countRes?.[0]?.cnt || 0);

    return {
      items: rows || [],
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // Detail + increment viewCount
  async findOne(id: string) {
    const thread = await this.em.findOne(ForumThread, { id }, { populate: ['authorId', 'categoryId'] });
    if (!thread) throw new NotFoundException('forum.thread_not_found');

    // increment viewCount
    await this.em.nativeUpdate(ForumThread, { id }, { viewCount: thread.viewCount + 1 });

    // reload
    const reloaded = await this.em.findOne(ForumThread, { id }, { populate: ['authorId', 'categoryId'] });
    return reloaded;
  }

  // Create — category REQUIRED
  async create(dto: CreateForumDto, authorId: string) {
    // Validate input
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('forum.title_required');
    }
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('forum.content_required');
    }
    if (!dto.categoryId) {
      throw new BadRequestException('forum.category_required');
    }

    // Check author exists
    const author = await this.em.findOne(User, { id: authorId });
    if (!author) throw new BadRequestException('forum.invalid_author');

    // Check category exists (required)
    const category = await this.em.findOne(ForumCategory, { id: dto.categoryId });
    if (!category) throw new BadRequestException('forum.category_not_found');

    // Prepare thread data
    const now = new Date();

    // Create thread
    const thread = this.em.create(ForumThread, {
      title: dto.title.trim(),
      slug: dto.slug?.trim() || this.slugify(dto.title),
      categoryId: category,
      authorId: author,
      content: dto.content.trim(),
      imageUrl: dto.imageUrl ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await this.em.persistAndFlush(thread);
    return thread;
  }

  // Update — author only
  async update(
    id: string,
    dto: UpdateForumDto,
    userId: string,
  ) {
    const thread = await this.em.findOne(ForumThread, { id }, { populate: ['authorId'] });
    if (!thread) throw new NotFoundException('forum.thread_not_found');

    // Check permission
    if (String(thread.authorId.id) !== String(userId)) {
      throw new ForbiddenException('forum.forbidden_update');
    }

    // Update fields
    if (dto.title) {
      const trimmed = dto.title.trim();
      if (!trimmed) throw new BadRequestException('forum.title_required');
      thread.title = trimmed;
    }

    if (dto.slug) {
      thread.slug = dto.slug.trim() || this.slugify(thread.title);
    }

    if (dto.content) {
      const trimmed = dto.content.trim();
      if (!trimmed) throw new BadRequestException('forum.content_required');
      thread.content = trimmed;
    }

    if (dto.imageUrl !== undefined) {
      thread.imageUrl = dto.imageUrl ?? null;
    }

    // Category: if provided, must exist (required)
    if (dto.categoryId) {
      const category = await this.em.findOne(ForumCategory, { id: dto.categoryId });
      if (!category) throw new BadRequestException('forum.category_not_found');
      thread.categoryId = category;
    }

    thread.updatedAt = new Date();

    await this.em.flush();
    return thread;
  }

  // Remove — author only (or ADMIN)
  async remove(id: string, userId: string, isAdmin = false) {
    const thread = await this.em.findOne(ForumThread, { id }, { populate: ['authorId'] });
    if (!thread) throw new NotFoundException('forum.thread_not_found');

    // Check permission
    if (!isAdmin && String(thread.authorId.id) !== String(userId)) {
      throw new ForbiddenException('forum.forbidden_delete');
    }

    await this.em.removeAndFlush(thread);
    return { success: true };
  }

  // Vote — value = 1 | -1, toggle behaviour (FIXED)
  async vote(threadId: string, userId: string, value: 1 | -1) {
    const thread = await this.em.findOne(ForumThread, { id: threadId });
    if (!thread) throw new NotFoundException('forum.thread_not_found');

    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new BadRequestException('forum.invalid_user');

    // Use raw SQL to reliably find existing vote (composite key issue fix)
    const existingRows = await this.em.execute(
      `select "value" from web."ForumThreadVote" where "userId" = ? and "threadId" = ?`,
      [userId, threadId],
    );

    const existingVote = existingRows?.[0];
    const existingValue = existingVote ? Number(existingVote.value) : null;

    if (existingValue === null) {
      // Create new vote
      const vote = this.em.create(ForumThreadVote, {
        threadId: thread,
        userId: user,
        value: String(value) as any,
      } as any);
      thread.score = (thread.score || 0) + value;
      await this.em.persistAndFlush([vote, thread]);
      return { result: 'voted', score: thread.score };
    }

    if (existingValue === value) {
      // Same vote: toggle off (remove)
      await this.em.execute(
        `delete from web."ForumThreadVote" where "userId" = ? and "threadId" = ?`,
        [userId, threadId],
      );
      thread.score = (thread.score || 0) - value;
      await this.em.persistAndFlush([thread]);
      return { result: 'unvoted', score: thread.score };
    } else {
      // Change vote
      await this.em.execute(
        `update web."ForumThreadVote" set "value" = ? where "userId" = ? and "threadId" = ?`,
        [String(value), userId, threadId],
      );
      thread.score = (thread.score || 0) + (value - existingValue);
      await this.em.persistAndFlush([thread]);
      return { result: 'changed', score: thread.score };
    }
  }

  // Helper: generate slug from title
  private slugify(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 200);
  }
}