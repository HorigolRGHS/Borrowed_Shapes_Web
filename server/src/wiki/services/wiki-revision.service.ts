import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { validateUploadOrThrow } from './wiki-upload-validator';
import { AuditActionType } from '../../entities/AuditActionType';
import { WikiPageRepository } from '../repositories/wiki-page.repository';
import { WikiRevisionRepository } from '../repositories/wiki-revision.repository';
import { WikiAssetRepository } from '../repositories/wiki-asset.repository';
import { WIKI_STORAGE } from './wiki-storage.service';
import type {
  WikiStorageService,
  WikiStorageStreamResult,
} from './wiki-storage.service';
import { WikiUploadResponseDto } from '../dto/wiki-upload.dto';
import {
  isWikiSlugUniqueError,
  validateSlugOrThrow,
  randomSlugSuffix,
} from '../repositories/wiki-write.helpers';
import { UPLOAD_MAX_SIZE } from '../dto/wiki-constants';
import { WikiDetailResponseDto } from '../dto/wiki-detail.dto';
import { WikiMetadataDto, compactMetadata } from '../dto/wiki-metadata.dto';
import { WikiCreateRequestDto } from '../dto/wiki-create.dto';
import { WikiUpdateRequestDto } from '../dto/wiki-update.dto';
import { WikiRollbackRequestDto } from '../dto/wiki-rollback.dto';
import { WikiAuditService } from './wiki-audit.service';
import { WikiService } from './wiki.service';

@Injectable()
export class WikiRevisionService {
  constructor(
    private readonly pageRepo: WikiPageRepository,
    private readonly revisionRepo: WikiRevisionRepository,
    private readonly assetRepo: WikiAssetRepository,
    @Inject(WIKI_STORAGE) private readonly storage: WikiStorageService,
    private audit: WikiAuditService,
    private wikiService: WikiService,
  ) {}

  streamImage(key: string): Promise<WikiStorageStreamResult> {
    // Key validation + NotFound mapping live in the storage adapter (WIKI_STORAGE port).
    return this.storage.getStream(key);
  }

  async uploadImage(
    wikiId: string,
    file: Express.Multer.File | undefined,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiUploadResponseDto> {
    if (!/^[A-Za-z0-9_-]+$/.test(wikiId)) {
      throw new BadRequestException('wiki.invalid_input');
    }

    const page = await this.pageRepo.existsById(wikiId);
    if (!page) throw new NotFoundException('wiki.not_found');

    if (!file) throw new BadRequestException('wiki.upload_missing');
    if (file.size > UPLOAD_MAX_SIZE)
      throw new PayloadTooLargeException('wiki.upload_too_large');

    const { mimeType, sanitizedName } = await validateUploadOrThrow(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    const stored = await this.storage.upload({
      wikiId,
      buffer: file.buffer,
      mimeType,
      originalName: sanitizedName,
    });

    let assetId: string;
    try {
      const asset = await this.assetRepo.insertAsset({
        fileName: sanitizedName,
        fileVersion: stored.key,
        filePath: stored.url,
        fileSize: BigInt(stored.size),
        mimeType,
      });
      assetId = asset.id;
    } catch (err) {
      // Compensating delete: R2 already stored the object but DB persist failed.
      // Best-effort cleanup; R2 DeleteObject is idempotent (no error if key is gone).
      await this.storage.delete(stored.key).catch(() => {});
      throw err;
    }

    await this.audit.recordStandalone({
      userId: adminUserId,
      actionType: AuditActionType.CREATE,
      entityName: 'FileAsset',
      entityId: assetId,
      newValue: { url: stored.url, mimeType, size: stored.size },
      ipAddress,
    });

    return {
      url: stored.url,
      assetId,
      mimeType,
      size: stored.size,
    };
  }

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
      this.pageRepo.runInTransaction(async () => {
        const page = this.pageRepo.createPage({
          slug: input.slug,
          slugVi: input.slugVi,
          title: input.title,
          titleVi: input.titleVi,
          metadataJson: compactMetadata(input.metadataJson),
          isPublished: input.isPublished,
        });
        try {
          await this.pageRepo.flush();
        } catch (err) {
          if (isWikiSlugUniqueError(err))
            throw new ConflictException('wiki.slug_taken');
          throw err;
        }

        const revision = this.revisionRepo.createRevision({
          page,
          authorId: adminUserId,
          content: input.content,
          contentVi: input.contentVi,
          summary: input.summary,
          summaryVi: input.summaryVi,
        });
        await this.pageRepo.flush();

        page.latestRevisionId = revision;
        this.audit.recordInCurrentUnitOfWork({
          userId: adminUserId,
          actionType: AuditActionType.CREATE,
          entityName: 'WikiPage',
          entityId: page.id,
          newValue: {
            slug: input.slug,
            slugVi: input.slugVi,
            title: input.title,
            titleVi: input.titleVi,
            firstRevisionId: revision.id,
            stub: isStub,
          },
          ipAddress,
        });

        await this.pageRepo.flush();

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

    return this.wikiService.getByIdForAdmin(result.pageId);
  }

  async update(
    pageId: string,
    dto: WikiUpdateRequestDto,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const result = await this.pageRepo.runInTransaction(async () => {
      const page = await this.pageRepo.findByIdWithLatestInTx(pageId);
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
        const newRevision = this.revisionRepo.createRevision({
          page,
          authorId: adminUserId,
          content: dto.content ?? '',
          contentVi: dto.contentVi ?? '',
          summary: dto.summary ?? null,
          summaryVi: dto.summaryVi ?? null,
        });
        try {
          await this.pageRepo.flush();
        } catch (err) {
          if (isWikiSlugUniqueError(err))
            throw new ConflictException('wiki.slug_taken');
          throw err;
        }
        page.latestRevisionId = newRevision;
        newRevisionId = newRevision.id;
      }

      this.audit.recordInCurrentUnitOfWork({
        userId: adminUserId,
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: page.id,
        newValue: {
          fromRevisionId: currentLatestId,
          toRevisionId: newRevisionId,
          changedFields: metadataDiff,
          publishStateChanged: publishStateChanged,
          forceOverwrite: forceOverwriteApplied,
        },
        ipAddress,
      });

      try {
        await this.pageRepo.flush();
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

    return this.wikiService.getByIdForAdmin(pageId);
  }

  async rollback(
    pageId: string,
    dto: WikiRollbackRequestDto,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const result = await this.pageRepo.runInTransaction(async () => {
      const page = await this.pageRepo.findByIdWithLatestInTx(pageId);
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

      const target = await this.revisionRepo.findByIdAndPageInTx(
        dto.targetRevisionId,
        pageId,
      );
      if (!target) throw new NotFoundException('wiki.revision_not_found');

      const newRevision = this.revisionRepo.createRevision({
        page,
        authorId: adminUserId,
        content: target.content,
        contentVi: target.contentVi,
        summary: `Rollback to revision ${target.id} (created ${target.createdAt.toISOString()})`,
        summaryVi: `Khôi phục về phiên bản ${target.id} (tạo ${target.createdAt.toISOString()})`,
      });
      await this.pageRepo.flush();

      page.latestRevisionId = newRevision;

      this.audit.recordInCurrentUnitOfWork({
        userId: adminUserId,
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: page.id,
        newValue: {
          action: 'rollback',
          targetRevisionId: target.id,
          fromRevisionId: currentLatestId,
          newRevisionId: newRevision.id,
        },
        ipAddress,
      });

      try {
        await this.pageRepo.flush();
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

    return this.wikiService.getByIdForAdmin(pageId);
  }

  async delete(
    pageId: string,
    adminUserId: string,
    ipAddress: string,
  ): Promise<void> {
    const snapshot = await this.pageRepo.runInTransaction(async () => {
      const page = await this.pageRepo.findByIdWithLatestAuthor(pageId);
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

      this.audit.recordInCurrentUnitOfWork({
        userId: adminUserId,
        actionType: AuditActionType.DELETE,
        entityName: 'WikiPage',
        entityId: page.id,
        oldValue,
        ipAddress,
      });

      await this.pageRepo.removeAndFlush(page);
    });
  }

  async publish(
    pageId: string,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const result = await this.pageRepo.runInTransaction(async () => {
      const page = await this.pageRepo.findByIdWithLatestInTx(pageId);
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

      this.audit.recordInCurrentUnitOfWork({
        userId: adminUserId,
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: pageId,
        newValue: { action: 'publish' },
        ipAddress,
      });

      await this.pageRepo.flush();
      return { noop: false };
    });

    return this.wikiService.getByIdForAdmin(pageId);
  }

  async unpublish(
    pageId: string,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    const result = await this.pageRepo.runInTransaction(async () => {
      const page = await this.pageRepo.existsById(pageId);
      if (!page) throw new NotFoundException('wiki.not_found');
      if (!page.isPublished) return { noop: true };
      page.isPublished = false;

      this.audit.recordInCurrentUnitOfWork({
        userId: adminUserId,
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: pageId,
        newValue: { action: 'unpublish' },
        ipAddress,
      });

      await this.pageRepo.flush();
      return { noop: false };
    });

    return this.wikiService.getByIdForAdmin(pageId);
  }
}
