import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FilterQuery } from '@mikro-orm/core';
import { Announcement } from '../entities/Announcement';
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
import { AnnouncementRepository } from './repositories/announcements.repository';

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
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
  ) {}

  // --- Public (user-facing) ---

  async findAllPublic(
    query: ListAnnouncementsQueryDto,
    lang: Lang,
  ): Promise<AnnouncementPublicListResponseDto> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? 10, 1, 50);
    const [announcements, total] =
      await this.announcementRepository.findPublicAnnouncements(query);

    const items: AnnouncementPublicListItemDto[] = announcements.map((a) =>
      this.toPublicListDto(a, lang),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOnePublic(
    slug: string,
    lang: Lang,
  ): Promise<AnnouncementPublicDetailDto> {
    const announcement = await this.announcementRepository.findOne(
      {
        $or: [{ slug }, { slugVi: slug }],
      },
      {
        populate: ['authorId'],
      },
    );

    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }

    const now = new Date();
    if (
      !announcement.isPublished ||
      (announcement.publishedAt && announcement.publishedAt > now)
    ) {
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
    const [announcements, total] =
      await this.announcementRepository.findAdminAnnouncements(query);

    const items: AnnouncementAdminListItemDto[] = announcements.map((a) =>
      this.toAdminListDto(a),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOneAdmin(id: string): Promise<AnnouncementAdminDetailDto> {
    const announcement = await this.announcementRepository.findOne(
      { id },
      {
        populate: ['authorId'],
      },
    );

    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }

    return this.toAdminDetailDto(announcement);
  }

  // --- Mutations ---

  async create(dto: CreateAnnouncementDto, authorId: string): Promise<null> {
    const existing = await this.announcementRepository.checkSlugUniqueness({
      slug: dto.slug,
      slugVi: dto.slugVi,
    });

    if (existing) {
      throw new BadRequestException('announcements.slug_taken');
    }

    const author = this.announcementRepository.getUserReference(authorId);
    let publishedAt: Date | undefined;
    if (dto.publishedAt) {
      publishedAt = new Date(dto.publishedAt);
    } else if (dto.isPublished) {
      publishedAt = new Date();
    }

    const announcement = this.announcementRepository.create({
      ...dto,
      authorId: author,
      publishedAt,
    });

    await this.announcementRepository.persistAndFlush(announcement);

    return null;
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<null> {
    const announcement = await this.announcementRepository.findOne(
      { id },
      {
        populate: ['authorId'],
      },
    );

    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }

    if (dto.slug || dto.slugVi) {
      const existing = await this.announcementRepository.checkSlugUniqueness(
        {
          slug: dto.slug,
          slugVi: dto.slugVi,
        },
        id,
      );

      if (existing) {
        throw new BadRequestException('announcements.slug_taken');
      }
    }

    let publishedAt = announcement.publishedAt;
    if (dto.publishedAt !== undefined) {
      publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : undefined;
    } else if (dto.isPublished === true && !publishedAt) {
      publishedAt = new Date();
    }

    this.announcementRepository.assign(announcement, {
      ...dto,
      publishedAt,
    });

    await this.announcementRepository.flush();

    return null;
  }

  async delete(id: string): Promise<void> {
    const announcement = await this.announcementRepository.findOne({ id });
    if (!announcement) {
      throw new NotFoundException('announcements.not_found');
    }
    await this.announcementRepository.removeAndFlush(announcement);
  }

  // --- Mappers ---

  private buildAuthor(a: Announcement) {
    const author = a.authorId;
    return author && author.id
      ? {
          id: author.id,
          displayName: (author.displayName as string | undefined) ?? '',
        }
      : null;
  }

  private toPublicListDto(
    a: Announcement,
    lang: Lang,
  ): AnnouncementPublicListItemDto {
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

  private toPublicDetailDto(
    a: Announcement,
    lang: Lang,
  ): AnnouncementPublicDetailDto {
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
