import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { WikiPage } from '../../entities/WikiPage';
import { WikiRevision } from '../../entities/WikiRevision';
import { User } from '../../entities/User';
import { AuditActionType } from '../../entities/AuditActionType';
import { WikiAuditService } from './wiki-audit.service';
import { WikiService } from './wiki.service';
import { WikiCreateRequestDto } from '../dto/wiki-create.dto';
import { WikiUpdateRequestDto } from '../dto/wiki-update.dto';
import { WikiRollbackRequestDto } from '../dto/wiki-rollback.dto';
import { WikiDetailResponseDto } from '../dto/wiki-detail.dto';
import { slugRejectionReason } from '../dto/wiki-slug.validator';
import { compactMetadata, WikiMetadataDto } from '../dto/wiki-metadata.dto';

function isWikiSlugUniqueError(err: any): boolean {
  if (err?.code !== '23505' && err?.driverError?.code !== '23505') return false;
  const constraint = err?.constraint ?? err?.driverError?.constraint ?? '';
  return constraint === 'WikiPage_slug_key' || constraint === 'WikiPage_slugVi_key';
}

function validateSlugOrThrow(slug: string): void {
  const reason = slugRejectionReason(slug);
  if (reason === 'reserved') throw new BadRequestException('wiki.reserved_slug');
  if (reason === 'invalid') throw new BadRequestException('wiki.invalid_slug');
}

function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
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
          if (isWikiSlugUniqueError(err)) throw new ConflictException('wiki.slug_taken');
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

        return { pageId: page.id, revisionId: revision.id, slug: input.slug, slugVi: input.slugVi, title: input.title, titleVi: input.titleVi };
      });

    const maxAttempts = isStub ? 3 : 1;
    let result: Awaited<ReturnType<typeof tryCreate>> | undefined;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        result = await tryCreate(buildInput());
        break;
      } catch (err) {
        if (isStub && err instanceof ConflictException && attempt < maxAttempts - 1) {
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

      const latest = (page.latestRevisionId ?? null) as WikiRevision | null;
      const currentLatestId = latest?.id ?? null;
      const conflictDetected = dto.expectedLatestRevisionId !== currentLatestId;
      const forceOverwriteApplied = conflictDetected && dto.forceOverwrite === true;

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

      if (dto.slug !== page.slug) validateSlugOrThrow(dto.slug);
      if (dto.slugVi !== page.slugVi) validateSlugOrThrow(dto.slugVi);

      const willPublish = dto.isPublished === true && page.isPublished === false;
      const effectiveContent = dto.content;
      const effectiveContentVi = dto.contentVi;
      if (willPublish && (effectiveContent === '' || effectiveContentVi === '')) {
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
      const publishStateChanged = dto.isPublished !== undefined && dto.isPublished !== page.isPublished;
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

      page.slug = dto.slug;
      page.slugVi = dto.slugVi;
      page.title = dto.title;
      page.titleVi = dto.titleVi;
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
          if (isWikiSlugUniqueError(err)) throw new ConflictException('wiki.slug_taken');
          throw err;
        }
        page.latestRevisionId = newRevision;
        newRevisionId = newRevision.id;
      }

      try {
        await em.flush();
      } catch (err) {
        if (isWikiSlugUniqueError(err)) throw new ConflictException('wiki.slug_taken');
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

      const latest = (page.latestRevisionId ?? null) as WikiRevision | null;
      const currentLatestId = latest?.id ?? null;
      if (dto.expectedLatestRevisionId !== currentLatestId) {
        throw new ConflictException({
          message: 'wiki.conflict_revision',
          currentLatest: latest ? { id: latest.id, createdAt: latest.createdAt } : null,
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

      const target = await em.findOne(
        WikiRevision,
        { id: dto.targetRevisionId, pageId: { id: pageId } as any },
      );
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
        if (isWikiSlugUniqueError(err)) throw new ConflictException('wiki.slug_taken');
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

  async delete(pageId: string, adminUserId: string, ipAddress: string): Promise<void> {
    const snapshot = await this.em.transactional(async (em) => {
      const page = await em.findOne(
        WikiPage,
        { id: pageId },
        { populate: ['latestRevisionId.authorId'] as any },
      );
      if (!page) throw new NotFoundException('wiki.not_found');

      const latest = (page.latestRevisionId ?? null) as WikiRevision | null;
      const author = latest?.authorId as User | undefined;
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

  async publish(pageId: string, adminUserId: string, ipAddress: string): Promise<WikiDetailResponseDto> {
    const result = await this.em.transactional(async (em) => {
      const page = await em.findOne(
        WikiPage,
        { id: pageId },
        { populate: ['latestRevisionId'] as any },
      );
      if (!page) throw new NotFoundException('wiki.not_found');
      if (page.isPublished) return { noop: true };
      const latest = (page.latestRevisionId ?? null) as WikiRevision | null;
      // TODO: Phase 5 i18n — `wiki.cannot_publish_no_revision` is added to backend locales now
      if (!latest) throw new BadRequestException('wiki.cannot_publish_no_revision');
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

  async unpublish(pageId: string, adminUserId: string, ipAddress: string): Promise<WikiDetailResponseDto> {
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
