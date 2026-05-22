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
import { WikiDetailResponseDto } from '../dto/wiki-detail.dto';
import { slugRejectionReason } from '../dto/wiki-slug.validator';

function isPostgresUniqueError(err: any): boolean {
  return err?.code === '23505' || err?.driverError?.code === '23505';
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
        if (isPostgresUniqueError(err)) throw new ConflictException('wiki.slug_taken');
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
}
