import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WikiPage } from '../../entities/WikiPage';
import { WikiRevision } from '../../entities/WikiRevision';
import {
  WIKI_LIST_DEFAULT_LIMIT,
  WIKI_LIST_MAX_LIMIT,
} from '../dto/wiki-constants';
import { WikiListItemDto, WikiListResponseDto } from '../dto/wiki-list.dto';
import { isValidSlug } from '../dto/wiki-slug.validator';
import { WikiDetailResponseDto, WikiDetailRevisionDto } from '../dto/wiki-detail.dto';

function escapeLike(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

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

    const where: any = {};
    if (!includeAll) where.isPublished = true;

    if (query.q && query.q.trim().length > 0) {
      const pattern = `%${escapeLike(query.q.trim())}%`;
      where.$or = [
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

  private toListItem(p: WikiPage): WikiListItemDto {
    const rev = p.latestRevisionId as unknown as WikiRevision | undefined;
    const author = rev?.authorId as any;
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
            author: author?.id
              ? { id: author.id, displayName: author.displayName ?? '' }
              : null,
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
    const rev = page.latestRevisionId as unknown as WikiRevision;
    const author = rev.authorId as any;
    const detailRev: WikiDetailRevisionDto = {
      id: rev.id,
      content: rev.content,
      content_vi: rev.content_vi,
      summary: rev.summary ?? null,
      summary_vi: rev.summary_vi ?? null,
      author: author?.id
        ? { id: author.id, displayName: author.displayName ?? '' }
        : null,
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
}
