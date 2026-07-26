import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { FilterQuery } from '@mikro-orm/core';
import { WikiRevision } from '../../entities/WikiRevision';
import { User } from '../../entities/User';
import { WikiPage } from '../../entities/WikiPage';

@Injectable()
export class WikiRevisionRepository extends BaseRepository<WikiRevision> {
  constructor(em: EntityManager) {
    super(em, WikiRevision);
  }

  // ---- Write primitives (run inside the service's transaction; no business rules) ----

  createRevision(data: {
    page: WikiPage;
    authorId: string;
    content: string;
    contentVi: string;
    summary: string | null;
    summaryVi: string | null;
  }): WikiRevision {
    const em = this.getEntityManager();
    return this.create({
      pageId: data.page,
      authorId: em.getReference(User, data.authorId),
      content: data.content,
      contentVi: data.contentVi,
      summary: data.summary,
      summaryVi: data.summaryVi,
    } as any);
  }

  findByIdAndPageInTx(
    revisionId: string,
    pageId: string,
  ): Promise<WikiRevision | null> {
    return this.findOne({
      id: revisionId,
      pageId: { id: pageId },
    } as FilterQuery<WikiRevision>);
  }

  countAll(): Promise<number> {
    return this.count({});
  }

  async countByPageIds(pageIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (pageIds.length === 0) return counts;
    const placeholders = pageIds.map(() => '?').join(', ');
    const rows: { pageId: string; c: number }[] =
      await this.getEntityManager().execute(
        `SELECT "pageId", COUNT(*)::int AS c FROM web."WikiRevision" WHERE "pageId" IN (${placeholders}) GROUP BY "pageId"`,
        pageIds,
      );
    for (const r of rows) counts.set(r.pageId, r.c);
    return counts;
  }

  findPageRevisionsPaged(
    pageId: string,
    opts: { limit: number; offset: number },
  ): Promise<[WikiRevision[], number]> {
    return this.findAndCount(
      { pageId: { id: pageId } } as FilterQuery<WikiRevision>,
      {
        populate: ['authorId'],
        orderBy: { createdAt: 'desc' },
        limit: opts.limit,
        offset: opts.offset,
      },
    );
  }

  findByIdAndPage(
    revisionId: string,
    pageId: string,
  ): Promise<WikiRevision | null> {
    return this.findOne(
      { id: revisionId, pageId: { id: pageId } } as FilterQuery<WikiRevision>,
      { populate: ['authorId'] },
    );
  }

  findPreviousBefore(
    pageId: string,
    before: Date,
  ): Promise<WikiRevision | null> {
    return this.findOne(
      {
        pageId: { id: pageId },
        createdAt: { $lt: before },
      } as FilterQuery<WikiRevision>,
      { populate: ['authorId'], orderBy: { createdAt: 'desc' } },
    );
  }
}
