import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository, FilterQuery } from '@mikro-orm/postgresql';
import { Announcement } from '../entities/Announcement';
import { User } from '../entities/User';
import { ListAnnouncementsQueryDto } from './dto/announcements-response.dto';
import { escapeLike } from '../common/utils/sql-like';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class AnnouncementRepository extends EntityRepository<Announcement> {
  constructor(em: EntityManager) {
    super(em, Announcement);
  }

  getUserReference(id: string): User {
    return this.em.getReference(User, id);
  }

  async flush(): Promise<void> {
    await this.em.flush();
  }

  async persistAndFlush(entity: any): Promise<void> {
    await this.em.persistAndFlush(entity);
  }

  async removeAndFlush(entity: any): Promise<void> {
    await this.em.removeAndFlush(entity);
  }

  async publishScheduled(): Promise<number> {
    return this.em.nativeUpdate(
      Announcement,
      {
        isPublished: false,
        publishedAt: { $ne: null, $lte: new Date() },
      },
      {
        isPublished: true,
      },
    );
  }

  async findPublicAnnouncements(
    query: ListAnnouncementsQueryDto,
  ): Promise<[Announcement[], number]> {
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

    return this.findAndCount(where, {
      populate: ['authorId'],
      orderBy: [
        { isPinned: 'desc' },
        { [sortBy]: order },
        { id: 'desc' },
      ],
      limit,
      offset,
    });
  }

  async findAdminAnnouncements(
    query: ListAnnouncementsQueryDto,
  ): Promise<[Announcement[], number]> {
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

    return this.findAndCount(where, {
      populate: ['authorId'],
      orderBy: [
        { isPinned: 'desc' },
        { [sortBy]: order },
        { id: 'desc' },
      ],
      limit,
      offset,
    });
  }

  async checkSlugUniqueness(dto: { slug?: string; slugVi?: string }, excludeId?: string): Promise<Announcement | null> {
    if (excludeId) {
      const conditions: FilterQuery<Announcement>[] = [];
      if (dto.slug) conditions.push({ slug: dto.slug });
      if (dto.slugVi) conditions.push({ slugVi: dto.slugVi });

      return this.findOne({
        $and: [
          { id: { $ne: excludeId } },
          { $or: conditions },
        ],
      });
    } else {
      return this.findOne({
        $or: [
          { slug: dto.slug },
          { slugVi: dto.slugVi },
        ],
      });
    }
  }
}
