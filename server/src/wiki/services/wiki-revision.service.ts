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

function isWikiSlugUniqueError(err: any): boolean {
  if (err?.code !== '23505' && err?.driverError?.code !== '23505') return false;
  const constraint = err?.constraint ?? err?.driverError?.constraint ?? '';
  return constraint === 'WikiPage_slug_key' || constraint === 'WikiPage_slug_vi_key';
}

function validateSlugOrThrow(slug: string): void {
  const reason = slugRejectionReason(slug);
  if (reason === 'reserved') throw new BadRequestException('wiki.reserved_slug');
  if (reason === 'invalid') throw new BadRequestException('wiki.invalid_slug');
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
    validateSlugOrThrow(dto.slug);
    validateSlugOrThrow(dto.slug_vi);

    const result = await this.em.transactional(async (em) => {
      const page = em.create(WikiPage, {
        slug: dto.slug,
        slug_vi: dto.slug_vi,
        title: dto.title,
        title_vi: dto.title_vi,
        metadataJson: dto.metadataJson ?? null,
        isPublished: dto.isPublished ?? false,
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
        content: dto.content,
        content_vi: dto.content_vi,
        summary: dto.summary ?? null,
        summary_vi: dto.summary_vi ?? null,
      } as any);
      await em.flush();

      page.latestRevisionId = revision;
      await em.flush();

      return { pageId: page.id, revisionId: revision.id };
    });

    await this.audit.log({
      userId: adminUserId,
      actionType: AuditActionType.CREATE,
      entityName: 'WikiPage',
      entityId: result.pageId,
      newValue: {
        slug: dto.slug,
        slug_vi: dto.slug_vi,
        title: dto.title,
        title_vi: dto.title_vi,
        firstRevisionId: result.revisionId,
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
          messageKey: 'wiki.conflict_revision',
          currentLatest: latest
            ? {
                id: latest.id,
                content: latest.content,
                content_vi: latest.content_vi,
                summary: latest.summary ?? null,
                summary_vi: latest.summary_vi ?? null,
                createdAt: latest.createdAt,
              }
            : null,
        });
      }

      if (dto.slug !== page.slug) validateSlugOrThrow(dto.slug);
      if (dto.slug_vi !== page.slug_vi) validateSlugOrThrow(dto.slug_vi);

      const willPublish = dto.isPublished === true && page.isPublished === false;
      const effectiveContent = dto.content;
      const effectiveContentVi = dto.content_vi;
      if (willPublish && (effectiveContent === '' || effectiveContentVi === '')) {
        throw new BadRequestException('wiki.cannot_publish_empty');
      }

      const metadataDiff: string[] = [];
      if (dto.slug !== page.slug) metadataDiff.push('slug');
      if (dto.slug_vi !== page.slug_vi) metadataDiff.push('slug_vi');
      if (dto.title !== page.title) metadataDiff.push('title');
      if (dto.title_vi !== page.title_vi) metadataDiff.push('title_vi');
      if (JSON.stringify(dto.metadataJson ?? null) !== JSON.stringify(page.metadataJson ?? null)) {
        metadataDiff.push('metadataJson');
      }
      const publishStateChanged = dto.isPublished !== undefined && dto.isPublished !== page.isPublished;
      if (publishStateChanged) metadataDiff.push('isPublished');

      const contentChanged =
        !latest ||
        dto.content !== latest.content ||
        dto.content_vi !== latest.content_vi ||
        (dto.summary ?? null) !== (latest.summary ?? null) ||
        (dto.summary_vi ?? null) !== (latest.summary_vi ?? null);

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
      page.slug_vi = dto.slug_vi;
      page.title = dto.title;
      page.title_vi = dto.title_vi;
      page.metadataJson = dto.metadataJson ?? null;
      if (dto.isPublished !== undefined) page.isPublished = dto.isPublished;

      let newRevisionId: string | null = currentLatestId;
      if (contentChanged) {
        const newRevision = em.create(WikiRevision, {
          pageId: page,
          authorId: em.getReference(User, adminUserId),
          content: dto.content,
          content_vi: dto.content_vi,
          summary: dto.summary ?? null,
          summary_vi: dto.summary_vi ?? null,
        } as any);
        await em.flush();
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
          messageKey: 'wiki.conflict_revision',
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
        content_vi: target.content_vi,
        summary: `Rollback to revision ${target.id} (created ${target.createdAt.toISOString()})`,
        summary_vi: `Khôi phục về phiên bản ${target.id} (tạo ${target.createdAt.toISOString()})`,
      } as any);
      await em.flush();

      page.latestRevisionId = newRevision;
      await em.flush();

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
          slug_vi: page.slug_vi,
          title: page.title,
          title_vi: page.title_vi,
          metadataJson: page.metadataJson ?? null,
          isPublished: page.isPublished,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        },
        latestRevision: latest
          ? {
              id: latest.id,
              content: latest.content,
              content_vi: latest.content_vi,
              summary: latest.summary ?? null,
              summary_vi: latest.summary_vi ?? null,
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
    await this.em.transactional(async (em) => {
      const page = await em.findOne(
        WikiPage,
        { id: pageId },
        { populate: ['latestRevisionId'] as any },
      );
      if (!page) throw new NotFoundException('wiki.not_found');
      const latest = (page.latestRevisionId ?? null) as WikiRevision | null;
      if (!latest || latest.content === '' || latest.content_vi === '') {
        throw new BadRequestException('wiki.cannot_publish_empty');
      }
      page.isPublished = true;
      await em.flush();
    });

    await this.audit.log({
      userId: adminUserId,
      actionType: AuditActionType.UPDATE,
      entityName: 'WikiPage',
      entityId: pageId,
      newValue: { action: 'publish' },
      ipAddress,
    });

    return this.wikiService.getByIdForAdmin(pageId);
  }

  async unpublish(pageId: string, adminUserId: string, ipAddress: string): Promise<WikiDetailResponseDto> {
    await this.em.transactional(async (em) => {
      const page = await em.findOne(WikiPage, { id: pageId });
      if (!page) throw new NotFoundException('wiki.not_found');
      page.isPublished = false;
      await em.flush();
    });

    await this.audit.log({
      userId: adminUserId,
      actionType: AuditActionType.UPDATE,
      entityName: 'WikiPage',
      entityId: pageId,
      newValue: { action: 'unpublish' },
      ipAddress,
    });

    return this.wikiService.getByIdForAdmin(pageId);
  }
}
