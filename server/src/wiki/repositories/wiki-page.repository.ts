import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { FilterQuery } from '@mikro-orm/core';
import { WikiPage } from '../../entities/WikiPage';

@Injectable()
export class WikiPageRepository extends EntityRepository<WikiPage> {
  constructor(em: EntityManager) {
    super(em, WikiPage);
  }

  countAll(): Promise<number> {
    return this.count({});
  }

  countPublished(): Promise<number> {
    return this.count({ isPublished: true });
  }

  findPublishedBySlug(slug: string): Promise<WikiPage | null> {
    return this.findOne(
      { $or: [{ slug }, { slugVi: slug }], isPublished: true },
      { populate: ['latestRevisionId.authorId'] },
    );
  }

  findByIdWithLatest(id: string): Promise<WikiPage | null> {
    return this.findOne({ id }, { populate: ['latestRevisionId.authorId'] });
  }

  findBySlugsMinimal(slugs: string[]): Promise<WikiPage[]> {
    // Partial-load (`fields`) narrows the return type; cast back to the full
    // entity so the interface consumed by Task 2/3 stays WikiPage[].
    return this.find(
      { $or: [{ slug: { $in: slugs } }, { slugVi: { $in: slugs } }] },
      { fields: ['id', 'slug', 'slugVi', 'title', 'titleVi'] },
    ) as Promise<WikiPage[]>;
  }

  listPaged(
    where: FilterQuery<WikiPage>,
    opts: { orderBy: Record<string, 'asc' | 'desc'>; limit: number; offset: number },
  ): Promise<[WikiPage[], number]> {
    return this.findAndCount(where, {
      populate: ['latestRevisionId.authorId'],
      orderBy: opts.orderBy,
      limit: opts.limit,
      offset: opts.offset,
    });
  }
}
