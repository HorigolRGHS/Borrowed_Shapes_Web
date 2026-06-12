import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FilterQuery } from '@mikro-orm/core';
import { Announcement } from '../entities/Announcement';
import { User } from '../entities/User';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ListAnnouncementsQueryDto, AnnouncementListResponseDto, AnnouncementResponseDto } from './dto/announcements-response.dto';
import { escapeLike } from '../common/utils/sql-like';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class AnnouncementService {
  constructor(private readonly em: EntityManager) {}

  async findAllPaginated(
    query: ListAnnouncementsQueryDto,
    isAdmin = false,
  ): Promise<AnnouncementListResponseDto> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? 10, 1, 50);
    const offset = (page - 1) * limit;

    const where: FilterQuery<Announcement> = {};

    // For public views, only show published announcements
    if (!isAdmin) {
      where.isPublished = true;
      where.publishedAt = { $lte: new Date() };
    }

    // Type filter
    if (query.type) {
      where.type = query.type;
    }

    // Search query
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

    const items: AnnouncementResponseDto[] = announcements.map((a) => this.toResponseDto(a));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(idOrSlug: string, isAdmin = false): Promise<AnnouncementResponseDto> {
    const where: FilterQuery<Announcement> = {
      $or: [
        { id: idOrSlug },
        { slug: idOrSlug },
        { slugVi: idOrSlug },
      ],
    };

    const announcement = await this.em.findOne(Announcement, where, {
      populate: ['authorId'],
    });

    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }

    // Check publication criteria for public views
    if (!isAdmin) {
      const now = new Date();
      if (!announcement.isPublished || (announcement.publishedAt && announcement.publishedAt > now)) {
        throw new NotFoundException('announcements.not_found');
      }
    }

    return this.toResponseDto(announcement);
  }

  async create(dto: CreateAnnouncementDto, authorId: string): Promise<AnnouncementResponseDto> {
    // Check if slug or slug_vi are already taken
    const existing = await this.em.findOne(Announcement, {
      $or: [
        { slug: dto.slug },
        { slugVi: dto.slug_vi },
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
      title: dto.title,
      titleVi: dto.title_vi,
      slug: dto.slug,
      slugVi: dto.slug_vi,
      summary: dto.summary,
      summaryVi: dto.summary_vi,
      content: dto.content,
      contentVi: dto.content_vi,
      type: dto.type,
      isPinned: dto.isPinned,
      isPublished: dto.isPublished,
      authorId: author,
      publishedAt,
    });

    await this.em.persistAndFlush(announcement);

    // Reload with author populating
    await this.em.populate(announcement, ['authorId']);

    return this.toResponseDto(announcement);
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<AnnouncementResponseDto> {
    const announcement = await this.em.findOne(Announcement, { id }, {
      populate: ['authorId'],
    });

    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }

    // Check slug uniqueness if updated
    if (dto.slug || dto.slug_vi) {
      const conditions: FilterQuery<Announcement>[] = [];
      if (dto.slug) conditions.push({ slug: dto.slug });
      if (dto.slug_vi) conditions.push({ slugVi: dto.slug_vi });

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

    const updateData: Partial<Announcement> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.title_vi !== undefined) updateData.titleVi = dto.title_vi;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.slug_vi !== undefined) updateData.slugVi = dto.slug_vi;
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.summary_vi !== undefined) updateData.summaryVi = dto.summary_vi;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.content_vi !== undefined) updateData.contentVi = dto.content_vi;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.isPinned !== undefined) updateData.isPinned = dto.isPinned;
    if (dto.isPublished !== undefined) updateData.isPublished = dto.isPublished;
    updateData.publishedAt = publishedAt;

    this.em.assign(announcement, updateData);

    await this.em.flush();

    return this.toResponseDto(announcement);
  }

  async delete(id: string): Promise<void> {
    const announcement = await this.em.findOne(Announcement, { id });
    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }
    await this.em.removeAndFlush(announcement);
  }

  private toResponseDto(a: Announcement): AnnouncementResponseDto {
    const author = a.authorId;
    return {
      id: a.id,
      slug: a.slug,
      slug_vi: a.slugVi,
      title: a.title,
      title_vi: a.titleVi,
      summary: a.summary,
      summary_vi: a.summaryVi,
      content: a.content,
      content_vi: a.contentVi,
      type: a.type,
      isPinned: a.isPinned,
      isPublished: a.isPublished,
      publishedAt: a.publishedAt,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author: author && author.id ? {
        id: author.id,
        displayName: (author.displayName as string | undefined) ?? '',
      } : null,
    };
  }
}
