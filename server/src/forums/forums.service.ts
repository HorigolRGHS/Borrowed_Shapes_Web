import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
import {
  ThreadImageUploadRequestDto,
  ThreadImageUploadResponseDto,
} from './dto/thread-image-upload.dto';
import { getProxyAvatarUrl } from '../auth/auth-utils';
import { getEffectiveExpiresAt } from '../achievements/achievements.service';
import { ForumThreadRepository } from './repositories/forums.repository';

@Injectable()
export class ForumService {
  constructor(
    private readonly threadRepository: ForumThreadRepository,
    private readonly storageService: R2StorageService,
    private readonly configService: ConfigService,
  ) {}

  async list(
    {
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
    locale: Locale = 'en',
  ) {
    const { rows, total } = await this.threadRepository.listThreads(
      {
        page,
        limit,
        q,
        categoryId,
        sortBy,
        order,
        month,
        year,
        postType,
        status,
      },
      user,
      locale,
    );

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
          role: row.authorRole,
          createdAt: row.authorCreatedAt,
          badgeImageUrl: (() => {
            if (!row.authorBadgeImageUrl) return null;
            const expiresAt = getEffectiveExpiresAt(
              row.authorBadgeType,
              row.authorBadgeSeasonMonth,
              row.authorBadgeExpiresAt,
            );
            if (
              row.authorBadgeType === 'SEASONAL' &&
              expiresAt &&
              expiresAt < new Date()
            ) {
              return null;
            }
            return row.authorBadgeImageUrl;
          })(),
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
    const thread = await this.threadRepository.findOne(
      { slug },
      { populate: ['authorId', 'categoryId'] },
    );
    if (!thread) throw new NotFoundException('forums.thread_not_found');

    if (thread.status === Web$46ForumThreadStatus.ARCHIVED) {
      const isAdmin = user?.role === 'ADMIN';
      const isAuthor =
        user?.userId && String(thread.authorId.id) === String(user.userId);
      if (!isAdmin && !isAuthor)
        throw new NotFoundException('forums.thread_not_found');
    }

    thread.viewCount = (Number(thread.viewCount) || 0) + 1;
    await this.threadRepository.getEntityManager().flush();

    return await this.mapThreadDetail(thread, locale, user?.userId);
  }

  async findOneById(id: string, locale: Locale = 'en') {
    const thread = await this.threadRepository.findOne(
      { id },
      { populate: ['authorId', 'categoryId'] },
    );
    if (!thread) throw new NotFoundException('forums.thread_not_found');
    return await this.mapThreadDetail(thread, locale);
  }

  private async mapThreadDetail(
    thread: ForumThread,
    locale: Locale,
    currentUserId?: string,
  ) {
    const category = thread.categoryId;
    const gp = await this.threadRepository
      .getEntityManager()
      .findOne(
        GameProfile,
        { userId: thread.authorId },
        { populate: ['equippedAchievementId'] },
      );

    let userVote: number | null = null;
    if (currentUserId) {
      const voteRows = await this.threadRepository
        .getEntityManager()
        .execute(
          `select "value" from web."ForumThreadVote" where "userId" = ? and "threadId" = ?`,
          [currentUserId, thread.id],
        );
      if (voteRows && voteRows.length > 0) {
        userVote = Number(voteRows[0].value);
      }
    }

    const badgeImageUrl =
      gp && (gp as any).equippedAchievementId
        ? (gp as any).equippedAchievementId.badgeImageUrl
        : null;
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
        role: thread.authorId.role,
        createdAt: thread.authorId.createdAt,
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

  async create(
    dto: CreateForumDto,
    authorId: string,
    isAdmin = false,
    locale: 'en' | 'vi' = 'en',
  ) {
    if (dto.isPinned !== undefined && !isAdmin) {
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

    const author = await this.threadRepository
      .getEntityManager()
      .findOne(User, { id: authorId });
    if (!author) throw new BadRequestException('forums.invalid_author');

    const category = await this.threadRepository
      .getEntityManager()
      .findOne(ForumCategory, { id: dto.categoryId });
    if (!category) throw new BadRequestException('forums.category_not_found');
    if (category.isOfficial && !isAdmin) {
      throw new ForbiddenException('forums.category_official_admin_only');
    }

    const now = new Date();

    const slug = this.slugify(dto.slug?.trim() || dto.title);

    const existingSlug = await this.threadRepository.findOne({ slug });
    if (existingSlug) {
      throw new BadRequestException('forums.slug_conflict');
    }

    const threadId = dto.id?.trim() || randomUUID();

    const thread = this.threadRepository.create({
      id: threadId,
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

    await this.threadRepository.getEntityManager().persistAndFlush(thread);
    return null;
  }

  async update(
    id: string,
    dto: UpdateForumDto,
    userId: string,
    isAdmin = false,
    locale: 'en' | 'vi' = 'en',
  ) {
    const thread = await this.threadRepository.findOne(
      { id },
      { populate: ['authorId'] },
    );
    if (!thread) throw new NotFoundException('forums.thread_not_found');

    if (String(thread.authorId.id) !== String(userId)) {
      throw new ForbiddenException('forums.forbidden_update');
    }

    if (dto.title) {
      const trimmed = dto.title.trim();
      if (!trimmed) throw new BadRequestException('forums.title_required');
      thread.title = trimmed;
    }

    if (dto.slug) {
      const newSlug = this.slugify(dto.slug.trim() || thread.title);
      if (!newSlug) throw new BadRequestException('forums.slug_required');

      if (newSlug !== thread.slug) {
        const existingSlug = await this.threadRepository
          .getEntityManager()
          .execute(
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

    let imageToDelete: string | null = null;
    if (dto.imageUrl !== undefined) {
      if (thread.imageUrl && thread.imageUrl !== dto.imageUrl) {
        imageToDelete = thread.imageUrl;
      }
      thread.imageUrl = dto.imageUrl ?? null;
    }

    if (dto.categoryId !== undefined) {
      const category = await this.threadRepository
        .getEntityManager()
        .findOne(ForumCategory, { id: dto.categoryId });
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

    await this.threadRepository.getEntityManager().flush();

    if (imageToDelete) {
      try {
        const idx = imageToDelete.indexOf('forums/');
        if (idx !== -1) {
          const key = imageToDelete.slice(idx);
          await this.storageService.deleteObject(key);
        }
      } catch (e: any) {
        console.error(`Failed to delete old R2 image ${imageToDelete}:`, e);
      }
    }

    return null;
  }

  async remove(id: string, userId: string, isAdmin = false) {
    const thread = await this.threadRepository.findOne(
      { id },
      { populate: ['authorId'] },
    );
    if (!thread) throw new NotFoundException('forums.thread_not_found');

    if (!isAdmin && String(thread.authorId.id) !== String(userId)) {
      throw new ForbiddenException('forums.forbidden_delete');
    }

    const imageUrlToDelete = thread.imageUrl;

    await this.threadRepository.getEntityManager().removeAndFlush(thread);

    if (imageUrlToDelete) {
      try {
        const idx = imageUrlToDelete.indexOf('forums/');
        if (idx !== -1) {
          const key = imageUrlToDelete.slice(idx);
          await this.storageService.deleteObject(key);
        }
      } catch (e: any) {
        console.error(`Failed to delete R2 image ${imageUrlToDelete}:`, e);
      }
    }

    return null;
  }

  async vote(threadId: string, userId: string, value: 1 | -1) {
    const thread = await this.threadRepository.findOne({ id: threadId });
    if (!thread) throw new NotFoundException('forums.thread_not_found');

    const user = await this.threadRepository
      .getEntityManager()
      .findOne(User, { id: userId });
    if (!user) throw new BadRequestException('forums.invalid_user');

    const existingRows = await this.threadRepository
      .getEntityManager()
      .execute(
        `select "value" from web."ForumThreadVote" where "userId" = ? and "threadId" = ?`,
        [userId, threadId],
      );

    const existingVote = existingRows?.[0];
    const existingValue = existingVote ? Number(existingVote.value) : null;

    if (existingValue === null) {
      const vote = this.threadRepository
        .getEntityManager()
        .create(ForumThreadVote, {
          threadId: thread,
          userId: user,
          value: String(value) as any,
        } as any);
      thread.score = (thread.score || 0) + value;
      await this.threadRepository
        .getEntityManager()
        .persistAndFlush([vote, thread]);
      return { result: 'voted', score: thread.score, userVote: value };
    }

    if (existingValue === value) {
      await this.threadRepository
        .getEntityManager()
        .execute(
          `delete from web."ForumThreadVote" where "userId" = ? and "threadId" = ?`,
          [userId, threadId],
        );
      thread.score = (thread.score || 0) - value;
      await this.threadRepository.getEntityManager().persistAndFlush([thread]);
      return { result: 'unvoted', score: thread.score, userVote: null };
    } else {
      await this.threadRepository
        .getEntityManager()
        .execute(
          `update web."ForumThreadVote" set "value" = ? where "userId" = ? and "threadId" = ?`,
          [String(value), userId, threadId],
        );
      thread.score = (thread.score || 0) + (value - existingValue);
      await this.threadRepository.getEntityManager().persistAndFlush([thread]);
      return { result: 'changed', score: thread.score, userVote: value };
    }
  }

  private slugify(s: string): string {
    if (!s) return '';
    const normalized = s.normalize('NFD');
    const withoutAccents = normalized
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .replace(/[\u0300-\u036f]/g, '');
    const lowercase = withoutAccents.toLowerCase();
    const withDashes = lowercase.replace(/\s+/g, '-');
    const cleaned = withDashes.replace(/[^a-z0-9\-_]/g, '');
    const trimmed = cleaned.replace(/^-+|-+$/g, '');
    return trimmed.slice(0, 200);
  }

  async uploadThreadImage(
    dto: ThreadImageUploadRequestDto,
    userId: string,
  ): Promise<ThreadImageUploadResponseDto> {
    const maxSize = 5 * 1024 * 1024;
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
    const key = `forums/${threadId}/thread-image/image-${Date.now()}.${ext}`;

    const uploadUrl = await this.storageService.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    const publicUrlBase = this.configService
      .getOrThrow<string>('R2_PUBLIC_DEV_URL')
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
