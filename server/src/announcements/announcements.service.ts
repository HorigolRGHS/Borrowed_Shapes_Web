import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FilterQuery } from '@mikro-orm/core';
import { Announcement } from '../entities/Announcement';
import { User } from '../entities/User';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import {
  ListAnnouncementsQueryDto,
  AnnouncementPublicListResponseDto,
  AnnouncementPublicListItemDto,
  AnnouncementPublicDetailDto,
  AnnouncementAdminListResponseDto,
  AnnouncementAdminListItemDto,
  AnnouncementAdminDetailDto,
} from './dto/announcements-response.dto';
import { escapeLike } from '../common/utils/sql-like';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

type Lang = 'vi' | 'en';

function parseLang(raw?: string): Lang {
  return raw?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

@Injectable()
export class AnnouncementService {
  constructor(private readonly em: EntityManager) { }

  // --- Public (user-facing) ---

  async findAllPublic(
    query: ListAnnouncementsQueryDto,
    lang: Lang,
  ): Promise<AnnouncementPublicListResponseDto> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? 10, 1, 50);
    const offset = (page - 1) * limit;

    const where: FilterQuery<Announcement> = {
      isPublished: true,
      publishedAt: { $lte: new Date() },
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.q && query.q.trim().length > 0) {
      const pattern = `%${escapeLike(query.q.trim())}%`;
      where.$or = [
        { title: { $ilike: pattern } },
        { titleVi: { $ilike: pattern } },
        { summary: { $ilike: pattern } },
        { summaryVi: { $ilike: pattern } },
      ];
    }

    const sortBy = query.sortBy ?? 'publishedAt';
    const order = query.order ?? 'desc';

    const [announcements, total] = await this.em.findAndCount(
      Announcement,
      where,
      {
        populate: ['authorId'],
        orderBy: [
          { isPinned: 'desc' },
          { [sortBy]: order },
          { id: 'desc' },
        ],
        limit,
        offset,
      },
    );

    const items: AnnouncementPublicListItemDto[] = announcements.map(
      (a) => this.toPublicListDto(a, lang),
    );

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOnePublic(slug: string, lang: Lang): Promise<AnnouncementPublicDetailDto> {
    const where: FilterQuery<Announcement> = {
      $or: [
        { slug },
        { slugVi: slug },
      ],
    };

    const announcement = await this.em.findOne(Announcement, where, {
      populate: ['authorId'],
    });

    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }

    const now = new Date();
    if (!announcement.isPublished || (announcement.publishedAt && announcement.publishedAt > now)) {
      throw new NotFoundException('announcements.not_found');
    }

    return this.toPublicDetailDto(announcement, lang);
  }

  // --- Admin ---

  async findAllAdmin(
    query: ListAnnouncementsQueryDto,
  ): Promise<AnnouncementAdminListResponseDto> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? 10, 1, 50);
    const offset = (page - 1) * limit;

    const where: FilterQuery<Announcement> = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.q && query.q.trim().length > 0) {
      const pattern = `%${escapeLike(query.q.trim())}%`;
      where.$or = [
        { title: { $ilike: pattern } },
        { titleVi: { $ilike: pattern } },
        { summary: { $ilike: pattern } },
        { summaryVi: { $ilike: pattern } },
      ];
    }

    const sortBy = query.sortBy ?? 'publishedAt';
    const order = query.order ?? 'desc';

    const [announcements, total] = await this.em.findAndCount(
      Announcement,
      where,
      {
        populate: ['authorId'],
        orderBy: [
          { isPinned: 'desc' },
          { [sortBy]: order },
          { id: 'desc' },
        ],
        limit,
        offset,
      },
    );

    const items: AnnouncementAdminListItemDto[] = announcements.map(
      (a) => this.toAdminListDto(a),
    );

    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOneAdmin(id: string): Promise<AnnouncementAdminDetailDto> {
    const announcement = await this.em.findOne(Announcement, { id }, {
      populate: ['authorId'],
    });

    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }

    return this.toAdminDetailDto(announcement);
  }

  // --- Mutations (unchanged) ---

  async create(dto: CreateAnnouncementDto, authorId: string): Promise<null> {
    // Check if slug or slug_vi are already taken
    const existing = await this.em.findOne(Announcement, {
      $or: [
        { slug: dto.slug },
        { slugVi: dto.slugVi },
      ],
    });

    if (existing) {
      throw new BadRequestException('announcements.slug_taken');
    }

    const author = this.em.getReference(User, authorId);
    let publishedAt: Date | undefined;
    if (dto.publishedAt) {
      publishedAt = new Date(dto.publishedAt);
    } else if (dto.isPublished) {
      publishedAt = new Date();
    }

    const announcement = this.em.create(Announcement, {
      ...dto,
      authorId: author,
      publishedAt,
    });

    await this.em.persistAndFlush(announcement);

    return null;
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<null> {
    const announcement = await this.em.findOne(Announcement, { id }, {
      populate: ['authorId'],
    });

    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }

    // Check slug uniqueness if updated
    if (dto.slug || dto.slugVi) {
      const conditions: FilterQuery<Announcement>[] = [];
      if (dto.slug) conditions.push({ slug: dto.slug });
      if (dto.slugVi) conditions.push({ slugVi: dto.slugVi });

      const existing = await this.em.findOne(Announcement, {
        $and: [
          { id: { $ne: id } },
          { $or: conditions },
        ],
      });

      if (existing) {
        throw new BadRequestException('announcements.slug_taken');
      }
    }

    // Update publishedAt logic if state toggles to published and has no publishedAt
    let publishedAt = announcement.publishedAt;
    if (dto.publishedAt !== undefined) {
      publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : undefined;
    } else if (dto.isPublished === true && !publishedAt) {
      publishedAt = new Date();
    }

    this.em.assign(announcement, {
      ...dto,
      publishedAt,
    });

    await this.em.flush();

    return null;
  }

  async delete(id: string): Promise<void> {
    const announcement = await this.em.findOne(Announcement, { id });
    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }
    await this.em.removeAndFlush(announcement);
  }

  // --- Mappers ---

  private buildAuthor(a: Announcement) {
    const author = a.authorId;
    return author && author.id ? {
      id: author.id,
      displayName: (author.displayName as string | undefined) ?? '',
    } : null;
  }

  private toPublicListDto(a: Announcement, lang: Lang): AnnouncementPublicListItemDto {
    const isVi = lang === 'vi';
    return {
      slug: isVi ? a.slugVi : a.slug,
      title: isVi ? a.titleVi : a.title,
      summary: isVi ? a.summaryVi : a.summary,
      type: a.type,
      isPinned: a.isPinned,
      isPublished: a.isPublished,
      publishedAt: a.publishedAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author: this.buildAuthor(a),
    };
  }

  private toPublicDetailDto(a: Announcement, lang: Lang): AnnouncementPublicDetailDto {
    const isVi = lang === 'vi';
    return {
      slug: isVi ? a.slugVi : a.slug,
      title: isVi ? a.titleVi : a.title,
      summary: isVi ? a.summaryVi : a.summary,
      content: isVi ? a.contentVi : a.content,
      type: a.type,
      isPinned: a.isPinned,
      isPublished: a.isPublished,
      publishedAt: a.publishedAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author: this.buildAuthor(a),
    };
  }

  private toAdminListDto(a: Announcement): AnnouncementAdminListItemDto {
    return {
      id: a.id,
      slug: a.slug,
      slugVi: a.slugVi,
      title: a.title,
      titleVi: a.titleVi,
      summary: a.summary,
      summaryVi: a.summaryVi,
      type: a.type,
      isPinned: a.isPinned,
      isPublished: a.isPublished,
      publishedAt: a.publishedAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author: this.buildAuthor(a),
    };
  }

  private toAdminDetailDto(a: Announcement): AnnouncementAdminDetailDto {
    return {
      id: a.id,
      slug: a.slug,
      slugVi: a.slugVi,
      title: a.title,
      titleVi: a.titleVi,
      summary: a.summary,
      summaryVi: a.summaryVi,
      content: a.content,
      contentVi: a.contentVi,
      type: a.type,
      isPinned: a.isPinned,
      isPublished: a.isPublished,
      publishedAt: a.publishedAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author: this.buildAuthor(a),
    };
  }
}
