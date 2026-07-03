import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { FilterQuery } from '@mikro-orm/core';
import { diffLines } from 'diff';
import { WikiPage } from '../../entities/WikiPage';
import { WikiRevision } from '../../entities/WikiRevision';
import { User } from '../../entities/User';
import { AuditActionType } from '../../entities/AuditActionType';
import { WikiPageRepository } from '../repositories/wiki-page.repository';
import { WikiRevisionRepository } from '../repositories/wiki-revision.repository';
import {
  WikiAuditRepository,
  WikiAuditLogParams,
} from '../repositories/wiki-audit.repository';
import {
  WIKI_LIST_DEFAULT_LIMIT,
  WIKI_LIST_MAX_LIMIT,
  WIKI_SEARCH_MAX_LENGTH,
} from '../dto/wiki-constants';
import { WikiListItemDto, WikiListResponseDto } from '../dto/wiki-list.dto';
import { isValidSlug, slugRejectionReason } from '../dto/wiki-slug.validator';
import {
  WikiDetailResponseDto,
  WikiDetailRevisionDto,
} from '../dto/wiki-detail.dto';
import {
  WikiHistoryItemDto,
  WikiHistoryResponseDto,
  WikiDiffChunkDto,
  WikiRevisionDiffResponseDto,
} from '../dto/wiki-history.dto';
import {
  RelatedPageDto,
  WikiMetadataDto,
  compactMetadata,
} from '../dto/wiki-metadata.dto';
import { WikiCreateRequestDto } from '../dto/wiki-create.dto';
import { WikiUpdateRequestDto } from '../dto/wiki-update.dto';
import { WikiRollbackRequestDto } from '../dto/wiki-rollback.dto';
import { escapeLike } from '../../common/utils/sql-like';
import type { Locale } from '../../common/utils/resolve-locale';
import {
  WikiPublicListItemDto,
  WikiPublicListResponseDto,
  WikiPublicDetailDto,
} from '../dto/wiki-public.dto';
import { WikiAdminStatsDto } from '../dto/wiki-admin-stats.dto';

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function isWikiSlugUniqueError(err: any): boolean {
  if (err?.code !== '23505' && err?.driverError?.code !== '23505') return false;
  const constraint = err?.constraint ?? err?.driverError?.constraint ?? '';
  return (
    constraint === 'WikiPage_slug_key' || constraint === 'WikiPage_slugVi_key'
  );
}

function validateSlugOrThrow(slug: string): void {
  const reason = slugRejectionReason(slug);
  if (reason === 'reserved')
    throw new BadRequestException('wiki.reserved_slug');
  if (reason === 'invalid') throw new BadRequestException('wiki.invalid_slug');
}

function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

@Injectable()
export class WikiAuditService {
  private readonly logger = new Logger(WikiAuditService.name);

  constructor(private readonly auditRepo: WikiAuditRepository) {}

  async log(params: WikiAuditLogParams): Promise<void> {
    // Auditing is intentionally non-blocking — failures log a warning, never throw.
    try {
      await this.auditRepo.insertForked(params);
    } catch (err) {
      this.logger.warn(
        `Audit log failed for userId=${params.userId} ${params.entityName}:${params.entityId} action=${params.actionType}: ${err}`,
      );
    }
  }
}

@Injectable()
export class WikiService {
  constructor(
    private readonly pageRepo: WikiPageRepository,
    private readonly revisionRepo: WikiRevisionRepository,
  ) {}

  async getAdminStats(): Promise<WikiAdminStatsDto> {
    const totalPages = await this.pageRepo.countAll();
    const published = await this.pageRepo.countPublished();
    const drafts = totalPages - published;
    const totalRevisions = await this.revisionRepo.countAll();
    return { totalPages, published, drafts, totalRevisions };
  }

  async list(
    query: {
      page?: number;
      limit?: number;
      q?: string;
      sort?: 'createdAt' | 'title';
      order?: 'asc' | 'desc';
    },
    includeAll: true,
    locale?: Locale,
  ): Promise<WikiListResponseDto>;
  async list(
    query: {
      page?: number;
      limit?: number;
      q?: string;
      sort?: 'createdAt' | 'title';
      order?: 'asc' | 'desc';
    },
    includeAll: false,
    locale?: Locale,
  ): Promise<WikiPublicListResponseDto>;
  async list(
    query: {
      page?: number;
      limit?: number;
      q?: string;
      sort?: 'createdAt' | 'title';
      order?: 'asc' | 'desc';
    },
    includeAll: boolean,
    locale: Locale = 'en',
  ): Promise<WikiListResponseDto | WikiPublicListResponseDto> {
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(
      query.limit ?? WIKI_LIST_DEFAULT_LIMIT,
      1,
      WIKI_LIST_MAX_LIMIT,
    );
    const offset = (page - 1) * limit;

    const where: FilterQuery<WikiPage> = {};
    if (!includeAll) (where as Record<string, unknown>).isPublished = true;

    if (query.q && query.q.trim().length > 0) {
      const pattern = `%${escapeLike(query.q.trim())}%`;
      (where as Record<string, unknown>).$or = [
        { title: { $ilike: pattern } },
        { titleVi: { $ilike: pattern } },
      ];
    }

    const sort = query.sort ?? 'createdAt';
    const order = query.order ?? 'desc';

    const [pages, total] = await this.pageRepo.listPaged(where, {
      orderBy: { [sort]: order },
      limit,
      offset,
    });

    const totalPages = Math.max(1, Math.ceil(total / limit));

    if (includeAll) {
      const pageIds = pages.map((p) => p.id);
      const revCounts = await this.revisionRepo.countByPageIds(pageIds);
      return {
        items: pages.map((p) => ({
          ...this.toListItem(p),
          revisionCount: revCounts.get(p.id) ?? 0,
        })),
        total,
        page,
        limit,
        totalPages,
      };
    }
    return {
      items: pages.map((p) => this.toPublicListItem(p, locale)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  private toAuthor(
    user: User | undefined | null,
  ): { id: string; displayName: string } | null {
    if (!user || !user.id) return null;
    return {
      id: user.id,
      displayName: (user.displayName as string | undefined) ?? '',
    };
  }

  private toListItem(p: WikiPage): WikiListItemDto {
    const rev = p.latestRevisionId;
    return {
      id: p.id,
      slug: p.slug,
      slugVi: p.slugVi,
      title: p.title,
      titleVi: p.titleVi,
      metadataJson: (p.metadataJson as WikiMetadataDto | undefined) ?? null,
      isPublished: p.isPublished,
      updatedAt: p.updatedAt,
      latestRevision: rev
        ? {
            id: rev.id,
            summary: rev.summary ?? null,
            summaryVi: rev.summaryVi ?? null,
            author: this.toAuthor(rev.authorId),
            createdAt: rev.createdAt,
          }
        : null,
    };
  }

  private toPublicListItem(p: WikiPage, locale: Locale): WikiPublicListItemDto {
    const rev = p.latestRevisionId;
    return {
      id: p.id,
      slug: locale === 'vi' ? p.slugVi : p.slug,
      title: locale === 'vi' ? p.titleVi : p.title,
      metadataJson: (p.metadataJson as WikiMetadataDto | undefined) ?? null,
      isPublished: p.isPublished,
      updatedAt: p.updatedAt,
      latestRevision: rev
        ? {
            id: rev.id,
            summary: (locale === 'vi' ? rev.summaryVi : rev.summary) ?? null,
            author: this.toAuthor(rev.authorId),
            createdAt: rev.createdAt,
          }
        : null,
    };
  }

  async getBySlug(
    slug: string,
    locale: Locale = 'en',
  ): Promise<WikiPublicDetailDto> {
    if (!isValidSlug(slug)) {
      throw new BadRequestException('wiki.invalid_slug');
    }
    const page = await this.pageRepo.findPublishedBySlug(slug);
    if (!page || !page.latestRevisionId) {
      throw new NotFoundException('wiki.not_found');
    }
    return this.toPublicDetail(page, slug, locale);
  }

  async getByIdForAdmin(id: string): Promise<WikiDetailResponseDto> {
    const page = await this.pageRepo.findByIdWithLatest(id);
    if (!page || !page.latestRevisionId) {
      throw new NotFoundException('wiki.not_found');
    }
    return this.toDetail(page, page.slug);
  }

  async findBySlugs(slugs: string[]): Promise<RelatedPageDto[]> {
    if (slugs.length === 0) return [];

    const rows = await this.pageRepo.findBySlugsMinimal(slugs);

    return slugs.map((s) => {
      const row = rows.find((r) => r.slug === s || r.slugVi === s);
      if (!row) return { slug: s, exists: false };
      return {
        slug: s,
        title: row.title,
        titleVi: row.titleVi,
        exists: true,
      };
    });
  }

  private toDetail(
    page: WikiPage,
    requestedSlug: string,
  ): WikiDetailResponseDto {
    const rev = page.latestRevisionId as WikiRevision;
    const detailRev: WikiDetailRevisionDto = {
      id: rev.id,
      content: rev.content,
      contentVi: rev.contentVi,
      summary: rev.summary ?? null,
      summaryVi: rev.summaryVi ?? null,
      author: this.toAuthor(rev.authorId),
      createdAt: rev.createdAt,
    };
    return {
      id: page.id,
      slug: page.slug,
      slugVi: page.slugVi,
      title: page.title,
      titleVi: page.titleVi,
      metadataJson: page.metadataJson ?? null,
      isPublished: page.isPublished,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      latestRevision: detailRev,
      matchedSlugLocale: requestedSlug === page.slug ? 'en' : 'vi',
    };
  }

  private toPublicDetail(
    page: WikiPage,
    requestedSlug: string,
    locale: Locale,
  ): WikiPublicDetailDto {
    const rev = page.latestRevisionId as WikiRevision;
    return {
      id: page.id,
      slug: locale === 'vi' ? page.slugVi : page.slug,
      title: locale === 'vi' ? page.titleVi : page.title,
      metadataJson:
        (page.metadataJson as Record<string, unknown> | undefined) ?? null,
      isPublished: page.isPublished,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      latestRevision: {
        id: rev.id,
        content: locale === 'vi' ? rev.contentVi : rev.content,
        summary: (locale === 'vi' ? rev.summaryVi : rev.summary) ?? null,
        author: this.toAuthor(rev.authorId),
        createdAt: rev.createdAt,
      },
      matchedSlugLocale: requestedSlug === page.slug ? 'en' : 'vi',
    };
  }

  async search(
    query: { q: string; page?: number; limit?: number },
    includeAll: boolean,
    locale: Locale = 'en',
  ): Promise<WikiPublicListResponseDto> {
    if (query.q.length > WIKI_SEARCH_MAX_LENGTH) {
      throw new BadRequestException('wiki.invalid_input');
    }
    const page = clamp(query.page ?? 1, 1, Number.MAX_SAFE_INTEGER);
    const limit = clamp(
      query.limit ?? WIKI_LIST_DEFAULT_LIMIT,
      1,
      WIKI_LIST_MAX_LIMIT,
    );
    const offset = (page - 1) * limit;

    const trimmed = query.q.trim();

    const where: FilterQuery<WikiPage> = {
      ...(includeAll ? {} : { isPublished: true }),
    };
    if (trimmed.length > 0) {
      const pattern = `%${escapeLike(trimmed)}%`;
      (where as Record<string, unknown>).$or = [
        { title: { $ilike: pattern } },
        { titleVi: { $ilike: pattern } },
      ];
    }

    // Note: relevance ordering via SQL CASE was attempted but MikroORM 6's
    // orderBy key-based API does not safely accept a raw CASE expression
    // (it gets quoted as an identifier). Falling back to updatedAt DESC,
    // which keeps results stable and predictable. Title-based ranking is
    // a nice-to-have rather than a BR requirement.
    const [pages, total] = await this.pageRepo.listPaged(where, {
      orderBy: { updatedAt: 'desc' },
      limit,
      offset,
    });

    return {
      items: pages.map((p) => this.toPublicListItem(p, locale)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getHistory(
    pageId: string,
    page: number,
    limit: number,
  ): Promise<WikiHistoryResponseDto> {
    const p = await this.pageRepo.findByIdWithLatest(pageId);
    if (!p) throw new NotFoundException('wiki.not_found');

    const safePage = clamp(page, 1, Number.MAX_SAFE_INTEGER);
    const safeLimit = clamp(limit, 1, WIKI_LIST_MAX_LIMIT);
    const offset = (safePage - 1) * safeLimit;

    const [revisions, total] = await this.revisionRepo.findPageRevisionsPaged(
      pageId,
      {
        limit: safeLimit,
        offset,
      },
    );

    const latestRev = p.latestRevisionId;
    const latestId = latestRev?.id ?? null;

    const items: WikiHistoryItemDto[] = revisions.map((r) => ({
      id: r.id,
      summary: r.summary ?? null,
      summaryVi: r.summaryVi ?? null,
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

  async getRevision(
    pageId: string,
    revisionId: string,
  ): Promise<WikiDetailRevisionDto> {
    const rev = await this.revisionRepo.findByIdAndPage(revisionId, pageId);
    if (!rev) throw new NotFoundException('wiki.revision_not_found');
    return this.toDetailRevision(rev);
  }

  async getRevisionDiff(
    pageId: string,
    revisionId: string,
  ): Promise<WikiRevisionDiffResponseDto> {
    const current = await this.revisionRepo.findByIdAndPage(revisionId, pageId);
    if (!current) throw new NotFoundException('wiki.revision_not_found');

    const previous = await this.revisionRepo.findPreviousBefore(
      pageId,
      current.createdAt,
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

    const enChunks = this.toDiffChunks(
      diffLines(
        stripImageData(previous.content),
        stripImageData(current.content),
      ),
    );
    const viChunks = this.toDiffChunks(
      diffLines(
        stripImageData(previous.contentVi),
        stripImageData(current.contentVi),
      ),
    );

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
      contentVi: rev.contentVi,
      summary: rev.summary ?? null,
      summaryVi: rev.summaryVi ?? null,
      author: this.toAuthor(rev.authorId),
      createdAt: rev.createdAt,
    };
  }

  private toDiffChunks(
    parts: {
      added?: boolean;
      removed?: boolean;
      value: string;
      count?: number;
    }[],
  ): WikiDiffChunkDto[] {
    return parts.map((part) => ({
      type: part.added ? 'add' : part.removed ? 'remove' : 'equal',
      value: part.value,
      count: part.count ?? part.value.split('\n').length,
    }));
  }
}

@Injectable()
export class WikiRevisionService {
  constructor(
    private em: EntityManager,
    private audit: WikiAuditService,
    private wikiService: WikiService,
  ) {}

  async create(
    dto: WikiCreateRequestDto,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const isStub = dto.stub === true;

    if (!isStub) {
      if (
        !dto.slug ||
        !dto.slugVi ||
        !dto.title ||
        !dto.titleVi ||
        dto.content === undefined ||
        dto.contentVi === undefined
      ) {
        throw new BadRequestException('wiki.invalid_input');
      }
      validateSlugOrThrow(dto.slug);
      validateSlugOrThrow(dto.slugVi);
    }

    const buildInput = () =>
      isStub
        ? {
            slug: `untitled-${randomSlugSuffix()}`,
            slugVi: `khong-ten-${randomSlugSuffix()}`,
            title: '',
            titleVi: '',
            content: '',
            contentVi: '',
            summary: null,
            summaryVi: null,
            metadataJson: null as WikiMetadataDto | null,
            isPublished: false,
          }
        : {
            slug: dto.slug!,
            slugVi: dto.slugVi!,
            title: dto.title!,
            titleVi: dto.titleVi!,
            content: dto.content ?? '',
            contentVi: dto.contentVi ?? '',
            summary: dto.summary ?? null,
            summaryVi: dto.summaryVi ?? null,
            metadataJson: dto.metadataJson ?? null,
            isPublished: dto.isPublished ?? false,
          };

    const tryCreate = (input: ReturnType<typeof buildInput>) =>
      this.em.transactional(async (em) => {
        const page = em.create(WikiPage, {
          slug: input.slug,
          slugVi: input.slugVi,
          title: input.title,
          titleVi: input.titleVi,
          metadataJson: compactMetadata(input.metadataJson),
          isPublished: input.isPublished,
        } as any);
        try {
          await em.flush();
        } catch (err) {
          if (isWikiSlugUniqueError(err))
            throw new ConflictException('wiki.slug_taken');
          throw err;
        }

        const revision = em.create(WikiRevision, {
          pageId: page,
          authorId: em.getReference(User, adminUserId),
          content: input.content,
          contentVi: input.contentVi,
          summary: input.summary,
          summaryVi: input.summaryVi,
        } as any);
        await em.flush();

        page.latestRevisionId = revision;
        await em.flush();

        return {
          pageId: page.id,
          revisionId: revision.id,
          slug: input.slug,
          slugVi: input.slugVi,
          title: input.title,
          titleVi: input.titleVi,
        };
      });

    const maxAttempts = isStub ? 3 : 1;
    let result: Awaited<ReturnType<typeof tryCreate>> | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        result = await tryCreate(buildInput());
        break;
      } catch (err) {
        if (
          isStub &&
          err instanceof ConflictException &&
          attempt < maxAttempts - 1
        ) {
          continue;
        }
        throw err;
      }
    }
    if (!result) throw new ConflictException('wiki.slug_taken');

    await this.audit.log({
      userId: adminUserId,
      actionType: AuditActionType.CREATE,
      entityName: 'WikiPage',
      entityId: result.pageId,
      newValue: {
        slug: result.slug,
        slugVi: result.slugVi,
        title: result.title,
        titleVi: result.titleVi,
        firstRevisionId: result.revisionId,
        stub: isStub,
      },
      ipAddress,
    });

    return this.wikiService.getByIdForAdmin(result.pageId);
  }

  async update(
    pageId: string,
    dto: WikiUpdateRequestDto,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const result = await this.em.transactional(async (em) => {
      const page = await em.findOne(
        WikiPage,
        { id: pageId },
        { populate: ['latestRevisionId'] as any },
      );
      if (!page) throw new NotFoundException('wiki.not_found');

      const latest = page.latestRevisionId ?? null;
      const currentLatestId = latest?.id ?? null;
      const conflictDetected = dto.expectedLatestRevisionId !== currentLatestId;
      const forceOverwriteApplied =
        conflictDetected && dto.forceOverwrite === true;

      if (conflictDetected && !dto.forceOverwrite) {
        throw new ConflictException({
          message: 'wiki.conflict_revision',
          currentLatest: latest
            ? {
                id: latest.id,
                content: latest.content,
                contentVi: latest.contentVi,
                summary: latest.summary ?? null,
                summaryVi: latest.summaryVi ?? null,
                createdAt: latest.createdAt,
              }
            : null,
        });
      }

      if (dto.slug !== undefined && dto.slug !== page.slug)
        validateSlugOrThrow(dto.slug);
      if (dto.slugVi !== undefined && dto.slugVi !== page.slugVi)
        validateSlugOrThrow(dto.slugVi);

      const willPublish =
        dto.isPublished === true && page.isPublished === false;
      const effectiveContent = dto.content;
      const effectiveContentVi = dto.contentVi;
      if (
        willPublish &&
        (effectiveContent === '' || effectiveContentVi === '')
      ) {
        throw new BadRequestException('wiki.cannot_publish_empty');
      }

      const metadataDiff: string[] = [];
      if (dto.slug !== page.slug) metadataDiff.push('slug');
      if (dto.slugVi !== page.slugVi) metadataDiff.push('slugVi');
      if (dto.title !== page.title) metadataDiff.push('title');
      if (dto.titleVi !== page.titleVi) metadataDiff.push('titleVi');
      if (
        JSON.stringify(compactMetadata(dto.metadataJson)) !==
        JSON.stringify(page.metadataJson ?? null)
      ) {
        metadataDiff.push('metadataJson');
      }
      const publishStateChanged =
        dto.isPublished !== undefined && dto.isPublished !== page.isPublished;
      if (publishStateChanged) metadataDiff.push('isPublished');

      const contentChanged =
        !latest ||
        dto.content !== latest.content ||
        dto.contentVi !== latest.contentVi ||
        (dto.summary ?? null) !== (latest.summary ?? null) ||
        (dto.summaryVi ?? null) !== (latest.summaryVi ?? null);

      if (!contentChanged && metadataDiff.length === 0) {
        return {
          pageId: page.id,
          fromRevisionId: currentLatestId,
          toRevisionId: currentLatestId,
          totalNoop: true,
          metadataDiff,
          publishStateChanged,
          forceOverwriteApplied,
        };
      }

      if (dto.slug !== undefined) page.slug = dto.slug;
      if (dto.slugVi !== undefined) page.slugVi = dto.slugVi;
      if (dto.title !== undefined) page.title = dto.title;
      if (dto.titleVi !== undefined) page.titleVi = dto.titleVi;
      page.metadataJson = compactMetadata(dto.metadataJson);
      if (dto.isPublished !== undefined) page.isPublished = dto.isPublished;

      let newRevisionId: string;
      {
        const newRevision = em.create(WikiRevision, {
          pageId: page,
          authorId: em.getReference(User, adminUserId),
          content: dto.content,
          contentVi: dto.contentVi,
          summary: dto.summary ?? null,
          summaryVi: dto.summaryVi ?? null,
        } as any);
        try {
          await em.flush();
        } catch (err) {
          if (isWikiSlugUniqueError(err))
            throw new ConflictException('wiki.slug_taken');
          throw err;
        }
        page.latestRevisionId = newRevision;
        newRevisionId = newRevision.id;
      }

      try {
        await em.flush();
      } catch (err) {
        if (isWikiSlugUniqueError(err))
          throw new ConflictException('wiki.slug_taken');
        throw err;
      }

      return {
        pageId: page.id,
        fromRevisionId: currentLatestId,
        toRevisionId: newRevisionId,
        totalNoop: false,
        metadataDiff,
        publishStateChanged,
        forceOverwriteApplied,
      };
    });

    if (!result.totalNoop) {
      await this.audit.log({
        userId: adminUserId,
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: result.pageId,
        newValue: {
          fromRevisionId: result.fromRevisionId,
          toRevisionId: result.toRevisionId,
          changedFields: result.metadataDiff,
          publishStateChanged: result.publishStateChanged,
          forceOverwrite: result.forceOverwriteApplied,
        },
        ipAddress,
      });
    }

    return this.wikiService.getByIdForAdmin(pageId);
  }

  async rollback(
    pageId: string,
    dto: WikiRollbackRequestDto,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const result = await this.em.transactional(async (em) => {
      const page = await em.findOne(
        WikiPage,
        { id: pageId },
        { populate: ['latestRevisionId'] as any },
      );
      if (!page) throw new NotFoundException('wiki.not_found');

      const latest = page.latestRevisionId ?? null;
      const currentLatestId = latest?.id ?? null;
      if (dto.expectedLatestRevisionId !== currentLatestId) {
        throw new ConflictException({
          message: 'wiki.conflict_revision',
          currentLatest: latest
            ? { id: latest.id, createdAt: latest.createdAt }
            : null,
        });
      }

      if (dto.targetRevisionId === currentLatestId) {
        return {
          pageId: page.id,
          noop: true,
          fromRevisionId: currentLatestId,
          newRevisionId: currentLatestId,
          targetRevisionId: dto.targetRevisionId,
        };
      }

      const target = await em.findOne(WikiRevision, {
        id: dto.targetRevisionId,
        pageId: { id: pageId } as any,
      });
      if (!target) throw new NotFoundException('wiki.revision_not_found');

      const newRevision = em.create(WikiRevision, {
        pageId: page,
        authorId: em.getReference(User, adminUserId),
        content: target.content,
        contentVi: target.contentVi,
        summary: `Rollback to revision ${target.id} (created ${target.createdAt.toISOString()})`,
        summaryVi: `Khôi phục về phiên bản ${target.id} (tạo ${target.createdAt.toISOString()})`,
      } as any);
      await em.flush();

      page.latestRevisionId = newRevision;
      try {
        await em.flush();
      } catch (err) {
        if (isWikiSlugUniqueError(err))
          throw new ConflictException('wiki.slug_taken');
        throw err;
      }

      return {
        pageId: page.id,
        noop: false,
        fromRevisionId: currentLatestId,
        newRevisionId: newRevision.id,
        targetRevisionId: target.id,
      };
    });

    if (!result.noop) {
      await this.audit.log({
        userId: adminUserId,
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: result.pageId,
        newValue: {
          action: 'rollback',
          targetRevisionId: result.targetRevisionId,
          fromRevisionId: result.fromRevisionId,
          newRevisionId: result.newRevisionId,
        },
        ipAddress,
      });
    }

    return this.wikiService.getByIdForAdmin(pageId);
  }

  async delete(
    pageId: string,
    adminUserId: string,
    ipAddress: string,
  ): Promise<void> {
    const snapshot = await this.em.transactional(async (em) => {
      const page = await em.findOne(
        WikiPage,
        { id: pageId },
        { populate: ['latestRevisionId.authorId'] as any },
      );
      if (!page) throw new NotFoundException('wiki.not_found');

      const latest = page.latestRevisionId ?? null;
      const author = latest?.authorId;
      const oldValue = {
        page: {
          id: page.id,
          slug: page.slug,
          slugVi: page.slugVi,
          title: page.title,
          titleVi: page.titleVi,
          metadataJson: page.metadataJson ?? null,
          isPublished: page.isPublished,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        },
        latestRevision: latest
          ? {
              id: latest.id,
              content: latest.content,
              contentVi: latest.contentVi,
              summary: latest.summary ?? null,
              summaryVi: latest.summaryVi ?? null,
              authorId: author?.id ?? null,
              createdAt: latest.createdAt,
            }
          : null,
      };

      await em.removeAndFlush(page);
      return { pageId: page.id, oldValue };
    });

    await this.audit.log({
      userId: adminUserId,
      actionType: AuditActionType.DELETE,
      entityName: 'WikiPage',
      entityId: snapshot.pageId,
      oldValue: snapshot.oldValue,
      ipAddress,
    });
  }

  async publish(
    pageId: string,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const result = await this.em.transactional(async (em) => {
      const page = await em.findOne(
        WikiPage,
        { id: pageId },
        { populate: ['latestRevisionId'] as any },
      );
      if (!page) throw new NotFoundException('wiki.not_found');
      if (page.isPublished) return { noop: true };
      const latest = page.latestRevisionId ?? null;
      // TODO: Phase 5 i18n — `wiki.cannot_publish_no_revision` is added to backend locales now
      if (!latest)
        throw new BadRequestException('wiki.cannot_publish_no_revision');
      if (latest.content === '' || latest.contentVi === '') {
        throw new BadRequestException('wiki.cannot_publish_empty');
      }
      page.isPublished = true;
      await em.flush();
      return { noop: false };
    });

    if (!result.noop) {
      await this.audit.log({
        userId: adminUserId,
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: pageId,
        newValue: { action: 'publish' },
        ipAddress,
      });
    }

    return this.wikiService.getByIdForAdmin(pageId);
  }

  async unpublish(
    pageId: string,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const result = await this.em.transactional(async (em) => {
      const page = await em.findOne(WikiPage, { id: pageId });
      if (!page) throw new NotFoundException('wiki.not_found');
      if (!page.isPublished) return { noop: true };
      page.isPublished = false;
      await em.flush();
      return { noop: false };
    });

    if (!result.noop) {
      await this.audit.log({
        userId: adminUserId,
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: pageId,
        newValue: { action: 'unpublish' },
        ipAddress,
      });
    }

    return this.wikiService.getByIdForAdmin(pageId);
  }
}
