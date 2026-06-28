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
import { Web$46ForumPostType } from '../entities/Web$46ForumPostType';
import { Web$46ForumThreadStatus } from '../entities/Web$46ForumThreadStatus';
import { GameProfile } from '../entities/GameProfile';
import { previewText } from '../common/utils/strip-markdown';
import { resolveLocale, Locale } from '../common/utils/resolve-locale';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';
import { randomUUID } from 'crypto';
import { ThreadImageUploadRequestDto, ThreadImageUploadResponseDto } from './dto/thread-image-upload.dto';
import { getProxyAvatarUrl } from '../auth/auth-utils';

@Injectable()
export class ForumService {
  constructor(
    private readonly em: EntityManager,
    private readonly storageService: R2StorageService,
    private readonly configService: ConfigService,
  ) { }

  // List: pagination + search + category + sort
  async list({
    page = 1,
    limit = 20,
    q = '',
    categoryId,
    sortBy = 'createdAt',
    order = 'desc',
    month,
    year,
    postType,
    status,
  }: any,
    user?: { userId?: string; role?: string },
    locale: Locale = 'en',) {
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

    if (postType) {
      clauses.push(`t."postType" = ?`);
      params.push(postType);
    }

    if (status) {
      clauses.push(`t."status" = ?`);
      params.push(status);
    }

    // Filter by month/year
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      clauses.push(`t."createdAt" >= ? and t."createdAt" < ?`);
      params.push(startDate, endDate);
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      clauses.push(`t."createdAt" >= ? and t."createdAt" < ?`);
      params.push(startDate, endDate);
    }

    // ARCHIVED visibility:
    // - Admin sees all
    // - Authenticated non-admin sees ARCHIVED only when they are the author
    // - Unauthenticated users or others don't see ARCHIVED
    if (!(user && user.role === 'ADMIN')) {
      if (user?.userId) {
        clauses.push(`(t."status" <> 'ARCHIVED' OR t."authorId" = ?)`);
        params.push(user.userId);
      } else {
        clauses.push(`t."status" <> 'ARCHIVED'`);
      }
    }

    const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
    const categoryNameField = locale === 'vi' ? 'c."name_vi"' : 'c."name"';
    const categorySlugField = locale === 'vi' ? 'c."slug_vi"' : 'c."slug"';
    // Build order clause: isPinned DESC first, then sortBy with order
    const validSortFields = ['score', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const orderClause = `order by t."isPinned" desc, t."${sortField}" ${sortOrder}`;

    // Select specific columns to avoid leaking sensitive data
    const rows = await this.em.execute(
      `
      select t."id", t."slug", t."title", t."content", t."score", 
             t."viewCount", t."isPinned", t."postType", t."status",
             t."createdAt", t."updatedAt", t."imageUrl",
             u."id" as "authorId", u."displayName" as "authorName", u."imgUrl" as "authorAvatar",
             a."badgeImageUrl" as "authorBadgeImageUrl",
             c."id" as "categoryId", ${categoryNameField} as "categoryName", ${categorySlugField} as "categorySlug"
      from web."ForumThread" t
      inner join auth."User" u on u."id" = t."authorId"
      left join game."GameProfile" gp on gp."userId" = u."id"
      left join game."Achievement" a on a."id" = gp."equippedAchievementId"
      inner join web."ForumCategory" c on c."id" = t."categoryId"
      ${where}
      ${orderClause}
      limit ? offset ?
      `,
      [...params, limit, offset],
    );

    const countRes = await this.em.execute(
      `select count(1) as cnt from web."ForumThread" t ${where}`,
      params,
    );

    const total = Number(countRes?.[0]?.cnt || 0);

    // const items = (rows || []).map((row: any) => ({
    //   ...row,
    //   content: previewText(row.content ?? '', 100),
    // }));

    const items = (rows || []).map((row: any) => {
      const base = {
        threadId: row.id,
        title: row.title,
        excerpt: previewText(row.content ?? '', 100),
        score: row.score,
        viewCount: row.viewCount,
        isPinned: row.isPinned,
        postType: row.postType,
        status: row.status,
        imgUrl: row.imageUrl,
        id: row.id,
        slug: row.slug,
        author: {
          id: row.authorId,
          displayName: row.authorName,
          imgUrl: row.authorAvatar,
          badgeImageUrl: row.authorBadgeImageUrl,
        },
        category: {
          id: row.categoryId,
          name: row.categoryName,
          slug: row.categorySlug,
        },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };

      return base;
    });

    return {
      items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findOneBySlug(
    slug: string,
    locale: Locale = 'en',
    user?: { userId?: string; role?: string },
  ) {
    const thread = await this.em.findOne(ForumThread, { slug }, { populate: ['authorId', 'categoryId'] });
    if (!thread) throw new NotFoundException('forums.thread_not_found');

    if (thread.status === Web$46ForumThreadStatus.ARCHIVED) {
      const isAdmin = user?.role === 'ADMIN';
      const isAuthor = user?.userId && String(thread.authorId.id) === String(user.userId);
      if (!isAdmin && !isAuthor) throw new NotFoundException('forums.thread_not_found');
    }

    thread.viewCount = (Number(thread.viewCount) || 0) + 1;
    await this.em.flush();

    return await this.mapThreadDetail(thread, locale, user?.userId);
  }

  async findOneById(id: string, locale: Locale = 'en') {
    const thread = await this.em.findOne(ForumThread, { id }, { populate: ['authorId', 'categoryId'] });
    if (!thread) throw new NotFoundException('forums.thread_not_found');
    return await this.mapThreadDetail(thread, locale);
  }

  private async mapThreadDetail(thread: ForumThread, locale: Locale, currentUserId?: string) {
    const category = thread.categoryId;
    const gp = await this.em.findOne(
      GameProfile,
      { userId: thread.authorId },
      { populate: ['equippedAchievementId'] },
    );

    let userVote: number | null = null;
    if (currentUserId) {
      const voteRows = await this.em.execute(
        `select "value" from web."ForumThreadVote" where "userId" = ? and "threadId" = ?`,
        [currentUserId, thread.id],
      );
      if (voteRows && voteRows.length > 0) {
        userVote = Number(voteRows[0].value);
      }
    }

    // const commentCountRes = await this.em.execute(
    //   `select count(1)::int as cnt from web."ForumComment" where "threadId" = ?`,
    //   [thread.id],
    // );
    // const commentCount = Number(commentCountRes?.[0]?.cnt || 0);

    const badgeImageUrl =
      gp && (gp as any).equippedAchievementId ? (gp as any).equippedAchievementId.badgeImageUrl : null;
    return {
      id: thread.id,
      title: thread.title,
      slug: thread.slug,
      content: thread.content,
      imageUrl: thread.imageUrl,
      score: thread.score,
      viewCount: thread.viewCount,
      isPinned: thread.isPinned,
      postType: thread.postType,
      status: thread.status,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      userVote,
      commentCount: thread.commentCount,
      author: {
        id: thread.authorId.id,
        displayName: thread.authorId.displayName,
        imgUrl: thread.authorId.imgUrl,
        badgeImageUrl,
      },
      category: category
        ? {
          id: category.id,
          name: locale === 'vi' ? category.nameVi : category.name,
          slug: locale === 'vi' ? category.slugVi : category.slug,
        }
        : null,
    };
  }

  // Create — auth required
  async create(dto: CreateForumDto, authorId: string, isAdmin = false, locale: 'en' | 'vi' = 'en') {
    // Validate input
    if ((dto.isPinned !== undefined) && !isAdmin) {
      throw new ForbiddenException('forums.forbidden_admin_only');
    }
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('forums.title_required');
    }
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('forums.content_required');
    }
    if (!dto.categoryId) {
      throw new BadRequestException('forums.category_required');
    }

    // Check author exists
    const author = await this.em.findOne(User, { id: authorId });
    if (!author) throw new BadRequestException('forums.invalid_author');

    // Check category exists (required)
    const category = await this.em.findOne(ForumCategory, { id: dto.categoryId });
    if (!category) throw new BadRequestException('forums.category_not_found');
    if (category.isOfficial && !isAdmin) {
      throw new ForbiddenException('forums.category_official_admin_only');
    }

    // Prepare thread data
    const now = new Date();

    const slug = this.slugify(dto.slug?.trim() || dto.title);

    // Check slug conflict
    const existingSlug = await this.em.findOne(ForumThread, { slug });
    if (existingSlug) {
      throw new BadRequestException('forums.slug_conflict');
    }

    // Create thread
    const thread = this.em.create(ForumThread, {
      title: dto.title.trim(),
      slug,
      categoryId: category,
      authorId: author,
      content: dto.content.trim(),
      imageUrl: dto.imageUrl ?? null,
      postType: dto.postType ?? Web$46ForumPostType.GENERAL,
      isPinned: dto.isPinned ?? false,
      status: dto.status ?? Web$46ForumThreadStatus.OPEN,
      createdAt: now,
      updatedAt: now,
    });

    await this.em.persistAndFlush(thread);
    return await this.mapThreadDetail(thread, locale);
  }

  // Update — author only
  async update(id: string, dto: UpdateForumDto, userId: string, isAdmin = false, locale: 'en' | 'vi' = 'en') {
    const thread = await this.em.findOne(ForumThread, { id }, { populate: ['authorId'] });
    if (!thread) throw new NotFoundException('forums.thread_not_found');

    // Check permission
    if (String(thread.authorId.id) !== String(userId)) {
      throw new ForbiddenException('forums.forbidden_update');
    }

    // Update fields
    // Check lại update ra 3 4 hình
    if (dto.title) {
      const trimmed = dto.title.trim();
      if (!trimmed) throw new BadRequestException('forums.title_required');
      thread.title = trimmed;
    }

    if (dto.slug) {
      const newSlug = this.slugify(dto.slug.trim() || thread.title);
      if (!newSlug) throw new BadRequestException('forums.slug_required');

      // Check slug conflict (if different from current)
      if (newSlug !== thread.slug) {
        const existingSlug = await this.em.execute(
          `select id from web."ForumThread" where slug = ? and id <> ?`,
          [newSlug, id],
        );
        if (existingSlug?.length) {
          throw new BadRequestException('forums.slug_conflict');
        }
      }
      thread.slug = newSlug;
    }

    if (dto.content) {
      const trimmed = dto.content.trim();
      if (!trimmed) throw new BadRequestException('forums.content_required');
      thread.content = trimmed;
    }

    if (dto.imageUrl !== undefined) {
      if (thread.imageUrl && thread.imageUrl !== dto.imageUrl) {
        try {
          const idx = thread.imageUrl.indexOf('forums/');
          if (idx !== -1) {
            const key = thread.imageUrl.slice(idx);
            await this.storageService.deleteObject(key);
          }
        } catch (e: any) {
          console.error(`Failed to delete old R2 image ${thread.imageUrl}:`, e);
        }
      }
      thread.imageUrl = dto.imageUrl ?? null;
    }

    // Category: if provided, must exist (required)
    if (dto.categoryId !== undefined) {
      const category = await this.em.findOne(ForumCategory, { id: dto.categoryId });
      if (!category) throw new BadRequestException('forums.category_not_found');
      if (category.isOfficial && !isAdmin) {
        throw new ForbiddenException('forums.category_official_admin_only');
      }
      thread.categoryId = category;
    }

    if (dto.postType) {
      thread.postType = dto.postType;
    }

    if (dto.status) {
      thread.status = dto.status;
    }

    if (dto.isPinned !== undefined) {
      if (!isAdmin) {
        throw new ForbiddenException('forums.forbidden_admin_only');
      }
      if (dto.isPinned !== undefined) thread.isPinned = dto.isPinned;
    }

    thread.updatedAt = new Date();

    await this.em.flush();
    return null;
  }

  // Remove — author or ADMIN
  async remove(id: string, userId: string, isAdmin = false) {
    const thread = await this.em.findOne(ForumThread, { id }, { populate: ['authorId'] });
    if (!thread) throw new NotFoundException('forums.thread_not_found');

    // Check permission
    if (!isAdmin && String(thread.authorId.id) !== String(userId)) {
      throw new ForbiddenException('forums.forbidden_delete');
    }

    if (thread.imageUrl) {
      try {
        const idx = thread.imageUrl.indexOf('forums/');
        if (idx !== -1) {
          const key = thread.imageUrl.slice(idx);
          await this.storageService.deleteObject(key);
        }
      } catch (e: any) {
        console.error(`Failed to delete R2 image ${thread.imageUrl}:`, e);
      }
    }

    await this.em.removeAndFlush(thread);
    return null;
  }

  // Vote — value = 1 | -1, toggle behaviour
  async vote(threadId: string, userId: string, value: 1 | -1) {
    const thread = await this.em.findOne(ForumThread, { id: threadId });
    if (!thread) throw new NotFoundException('forums.thread_not_found');

    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new BadRequestException('forums.invalid_user');

    // Use raw SQL to reliably find existing vote
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
      return { result: 'voted', score: thread.score, userVote: value };
    }

    if (existingValue === value) {
      // Same vote: toggle off (remove)
      await this.em.execute(
        `delete from web."ForumThreadVote" where "userId" = ? and "threadId" = ?`,
        [userId, threadId],
      );
      thread.score = (thread.score || 0) - value;
      await this.em.persistAndFlush([thread]);
      return { result: 'unvoted', score: thread.score, userVote: null };
    } else {
      // Change vote
      await this.em.execute(
        `update web."ForumThreadVote" set "value" = ? where "userId" = ? and "threadId" = ?`,
        [String(value), userId, threadId],
      );
      thread.score = (thread.score || 0) + (value - existingValue);
      await this.em.persistAndFlush([thread]);
      return { result: 'changed', score: thread.score, userVote: value };
    }
  }

  // Helper: generate slug from title
  // I'm not using AI to comment this
  private slugify(s: string): string {
    if (!s) return '';
    // Normalize Unicode: NFD separates characters and diacritics into individual parts
    const normalized = s.normalize('NFD');
    // Remove accents using regex, also convert đ to d, Đ to D
    const withoutAccents = normalized
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .replace(/[\u0300-\u036f]/g, '');
    const lowercase = withoutAccents.toLowerCase();
    // Replace whitespace with dashes
    const withDashes = lowercase.replace(/\s+/g, '-');
    // Remove invalid characters (keep only a-z, 0-9, dashes, underscores)
    const cleaned = withDashes.replace(/[^a-z0-9\-_]/g, '');
    const trimmed = cleaned.replace(/^-+|-+$/g, '');
    return trimmed.slice(0, 200);
  }

  async uploadThreadImage(dto: ThreadImageUploadRequestDto, userId: string): Promise<ThreadImageUploadResponseDto> {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (dto.fileSize > maxSize) {
      throw new BadRequestException('forums.image_too_large');
    }

    const extByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const threadId = dto.threadId ?? randomUUID();
    const ext = extByMime[dto.mimeType] ?? 'png';
    const key = `forums/${threadId}/thread-image/image.${ext}`;

    const uploadUrl = await this.storageService.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    const publicUrlBase = this.configService
      .get<string>('R2_PUBLIC_DEV_URL', 'https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev')
      .replace(/\/+$/, '');

    return {
      uploadUrl,
      method: 'PUT',
      key,
      publicUrl: `${publicUrlBase}/${key}`,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }
}