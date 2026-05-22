import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FilterQuery } from '@mikro-orm/core';
import { WikiPage } from '../../entities/WikiPage';
import { WikiRevision } from '../../entities/WikiRevision';
import { User } from '../../entities/User';
import {
  WIKI_LIST_DEFAULT_LIMIT,
  WIKI_LIST_MAX_LIMIT,
  WIKI_SEARCH_MAX_LENGTH,
} from '../dto/wiki-constants';
import { WikiListItemDto, WikiListResponseDto } from '../dto/wiki-list.dto';
import { isValidSlug } from '../dto/wiki-slug.validator';
import { WikiDetailResponseDto, WikiDetailRevisionDto } from '../dto/wiki-detail.dto';
import {
  WikiHistoryItemDto,
  WikiHistoryResponseDto,
  WikiDiffChunkDto,
  WikiRevisionDiffResponseDto,
} from '../dto/wiki-history.dto';
import { diffLines } from 'diff';
import { escapeLike } from '../../common/utils/sql-like';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

@Injectable()
export class WikiService {
  constructor(private em: EntityManager) {}

  async list(
    query: { page?: number; limit?: number; q?: string; sort?: 'createdAt' | 'title'; order?: 'asc' | 'desc' },
    includeAll: boolean,
  ): Promise<WikiListResponseDto> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? WIKI_LIST_DEFAULT_LIMIT, 1, WIKI_LIST_MAX_LIMIT);
    const offset = (page - 1) * limit;

    const where: FilterQuery<WikiPage> = {};
    if (!includeAll) (where as Record<string, unknown>).isPublished = true;

    if (query.q && query.q.trim().length > 0) {
      const pattern = `%${escapeLike(query.q.trim())}%`;
      (where as Record<string, unknown>).$or = [
        { title: { $ilike: pattern } },
        { title_vi: { $ilike: pattern } },
      ];
    }

    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';

    const [pages, total] = await this.em.findAndCount(
      WikiPage,
      where,
      {
        populate: ['latestRevisionId.authorId'],
        orderBy: { [sort]: order },
        limit,
        offset,
      },
    );

    const items: WikiListItemDto[] = pages.map((p) => this.toListItem(p));
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private toAuthor(user: User | undefined | null): { id: string; displayName: string } | null {
    if (!user || !user.id) return null;
    return { id: user.id, displayName: (user.displayName as string | undefined) ?? '' };
  }

  private toListItem(p: WikiPage): WikiListItemDto {
    const rev = p.latestRevisionId;
    return {
      id: p.id,
      slug: p.slug,
      slug_vi: p.slug_vi,
      title: p.title,
      title_vi: p.title_vi,
      isPublished: p.isPublished,
      updatedAt: p.updatedAt,
      latestRevision: rev
        ? {
            id: rev.id,
            summary: rev.summary ?? null,
            summary_vi: rev.summary_vi ?? null,
            author: this.toAuthor(rev.authorId),
            createdAt: rev.createdAt,
          }
        : null,
    };
  }

  async getBySlug(slug: string): Promise<WikiDetailResponseDto> {
    if (!isValidSlug(slug)) {
      throw new BadRequestException('wiki.invalid_slug');
    }
    const page = await this.em.findOne(
      WikiPage,
      { $or: [{ slug }, { slug_vi: slug }], isPublished: true },
      { populate: ['latestRevisionId.authorId'] },
    );
    if (!page || !page.latestRevisionId) {
      throw new NotFoundException('wiki.not_found');
    }
    return this.toDetail(page, slug);
  }

  async getByIdForAdmin(id: string): Promise<WikiDetailResponseDto> {
    const page = await this.em.findOne(
      WikiPage,
      { id },
      { populate: ['latestRevisionId.authorId'] },
    );
    if (!page || !page.latestRevisionId) {
      throw new NotFoundException('wiki.not_found');
    }
    return this.toDetail(page, page.slug);
  }

  private toDetail(page: WikiPage, requestedSlug: string): WikiDetailResponseDto {
    const rev = page.latestRevisionId as WikiRevision;
    const detailRev: WikiDetailRevisionDto = {
      id: rev.id,
      content: rev.content,
      content_vi: rev.content_vi,
      summary: rev.summary ?? null,
      summary_vi: rev.summary_vi ?? null,
      author: this.toAuthor(rev.authorId),
      createdAt: rev.createdAt,
    };
    return {
      id: page.id,
      slug: page.slug,
      slug_vi: page.slug_vi,
      title: page.title,
      title_vi: page.title_vi,
      metadataJson: page.metadataJson ?? null,
      isPublished: page.isPublished,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      latestRevision: detailRev,
      matchedSlugLocale: requestedSlug === page.slug ? 'en' : 'vi',
    };
  }

  async search(
    query: { q: string; page?: number; limit?: number },
    includeAll: boolean,
  ): Promise<WikiListResponseDto> {
    if (query.q.length > WIKI_SEARCH_MAX_LENGTH) {
      throw new BadRequestException('wiki.invalid_input');
    }
    const trimmed = query.q.trim();
    if (trimmed.length === 0) {
      return this.list({ page: query.page, limit: query.limit }, includeAll);
    }

    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(query.limit ?? WIKI_LIST_DEFAULT_LIMIT, 1, WIKI_LIST_MAX_LIMIT);
    const offset = (page - 1) * limit;

    const pattern = `%${escapeLike(trimmed)}%`;

    const where: FilterQuery<WikiPage> = {
      $or: [
        { title: { $ilike: pattern } },
        { title_vi: { $ilike: pattern } },
      ],
      ...(includeAll ? {} : { isPublished: true }),
    };

    // Note: relevance ordering via SQL CASE was attempted but MikroORM 6's
    // orderBy key-based API does not safely accept a raw CASE expression
    // (it gets quoted as an identifier). Falling back to updatedAt DESC,
    // which keeps results stable and predictable. Title-based ranking is
    // a nice-to-have rather than a BR requirement.
    const [pages, total] = await this.em.findAndCount(
      WikiPage,
      where,
      {
        populate: ['latestRevisionId.authorId'],
        orderBy: { updatedAt: 'desc' },
        limit,
        offset,
      },
    );

    return {
      items: pages.map((p) => this.toListItem(p)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getHistory(pageId: string, page: number, limit: number): Promise<WikiHistoryResponseDto> {
    const p = await this.em.findOne(
      WikiPage,
      { id: pageId },
      { populate: ['latestRevisionId'] },
    );
    if (!p) throw new NotFoundException('wiki.not_found');

    const safePage = clamp(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clamp(limit, 1, WIKI_LIST_MAX_LIMIT);
    const offset = (safePage - 1) * safeLimit;

    const [revisions, total] = await this.em.findAndCount(
      WikiRevision,
      { pageId: p } as FilterQuery<WikiRevision>,
      {
        populate: ['authorId'],
        orderBy: { createdAt: 'desc' },
        limit: safeLimit,
        offset,
      },
    );

    const latestRev = p.latestRevisionId;
    const latestId = latestRev?.id ?? null;

    const items: WikiHistoryItemDto[] = revisions.map((r) => ({
      id: r.id,
      summary: r.summary ?? null,
      summary_vi: r.summary_vi ?? null,
      author: this.toAuthor(r.authorId),
      createdAt: r.createdAt,
      isLatest: r.id === latestId,
    }));

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async getRevision(pageId: string, revisionId: string): Promise<WikiDetailRevisionDto> {
    const rev = await this.em.findOne(
      WikiRevision,
      { id: revisionId, pageId: this.em.getReference(WikiPage, pageId) } as FilterQuery<WikiRevision>,
      { populate: ['authorId'] },
    );
    if (!rev) throw new NotFoundException('wiki.revision_not_found');
    return this.toDetailRevision(rev);
  }

  async getRevisionDiff(pageId: string, revisionId: string): Promise<WikiRevisionDiffResponseDto> {
    const current = await this.em.findOne(
      WikiRevision,
      { id: revisionId, pageId: this.em.getReference(WikiPage, pageId) } as FilterQuery<WikiRevision>,
      { populate: ['authorId'] },
    );
    if (!current) throw new NotFoundException('wiki.revision_not_found');

    const previous = await this.em.findOne(
      WikiRevision,
      {
        pageId: this.em.getReference(WikiPage, pageId),
        createdAt: { $lt: current.createdAt },
      } as FilterQuery<WikiRevision>,
      { populate: ['authorId'], orderBy: { createdAt: 'desc' } },
    );

    if (!previous) {
      return {
        current: this.toDetailRevision(current),
        previous: null,
        isFirst: true,
        diff: null,
      };
    }

    const stripImageData = (md: string): string =>
      md.replace(/!\[[^\]]*\]\(data:[^)]+\)/g, '![image](data-url-stripped)');

    const enChunks = this.toDiffChunks(diffLines(stripImageData(previous.content), stripImageData(current.content)));
    const viChunks = this.toDiffChunks(diffLines(stripImageData(previous.content_vi), stripImageData(current.content_vi)));

    return {
      current: this.toDetailRevision(current),
      previous: this.toDetailRevision(previous),
      isFirst: false,
      diff: { en: enChunks, vi: viChunks },
    };
  }

  private toDetailRevision(rev: WikiRevision): WikiDetailRevisionDto {
    return {
      id: rev.id,
      content: rev.content,
      content_vi: rev.content_vi,
      summary: rev.summary ?? null,
      summary_vi: rev.summary_vi ?? null,
      author: this.toAuthor(rev.authorId),
      createdAt: rev.createdAt,
    };
  }

  private toDiffChunks(parts: { added?: boolean; removed?: boolean; value: string; count?: number }[]): WikiDiffChunkDto[] {
    return parts.map((part) => ({
      type: part.added ? 'add' : part.removed ? 'remove' : 'equal',
      value: part.value,
      count: part.count ?? part.value.split('\n').length,
    }));
  }
}
