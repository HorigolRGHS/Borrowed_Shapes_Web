import {
  Controller, Post, UseInterceptors, UploadedFile, Req, Inject, BadRequestException, PayloadTooLargeException, UseFilters,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Request } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { RequestUser } from '../../auth/decorators/current-user.decorator';
import { WIKI_STORAGE } from '../services/wiki-storage.service';
import type { WikiStorageService } from '../services/wiki-storage.service';
import { WikiAuditService } from '../services/wiki-audit.service';
import { validateUploadOrThrow } from '../services/wiki-upload-validator';
import { FileAsset } from '../../entities/FileAsset';
import { AuditActionType } from '../../entities/AuditActionType';
import { WikiUploadResponseDto } from '../dto/wiki-upload.dto';
import { ApiResponseDto, okResponse } from '../../common/dto/api-response.dto';
import { UPLOAD_MAX_SIZE } from '../dto/wiki-constants';
import { MulterExceptionFilter } from './multer-exception.filter';

@ApiTags('Wiki Upload')
@Roles('ADMIN')
@UseFilters(MulterExceptionFilter)
@Controller('wiki')
export class WikiUploadController {
  constructor(
    @Inject(WIKI_STORAGE) private storage: WikiStorageService,
    private em: EntityManager,
    private audit: WikiAuditService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: UPLOAD_MAX_SIZE, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Admin: upload an image (jpeg/png/webp/gif, max 5MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, type: WikiUploadResponseDto })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<WikiUploadResponseDto>> {
    if (!file) throw new BadRequestException('wiki.upload_missing');
    if (file.size > UPLOAD_MAX_SIZE) throw new PayloadTooLargeException('wiki.upload_too_large');

    const { mimeType, sanitizedName } = await validateUploadOrThrow(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    const stored = await this.storage.upload({
      buffer: file.buffer,
      mimeType,
      originalName: sanitizedName,
    });

    let asset: FileAsset;
    try {
      asset = this.em.create(FileAsset, {
        fileName: sanitizedName,
        fileVersion: stored.key,
        filePath: stored.url,
        fileSize: BigInt(stored.size),
        mimeType,
      } as any);
      await this.em.flush();
    } catch (err) {
      // Compensating delete: R2 already stored the object but DB persist failed.
      // Best-effort cleanup; R2 DeleteObject is idempotent (no error if key is gone).
      await this.storage.delete(stored.key).catch(() => {});
      throw err;
    }

    await this.audit.log({
      userId: user.userId,
      actionType: AuditActionType.CREATE,
      entityName: 'FileAsset',
      entityId: asset.id,
      newValue: { url: stored.url, mimeType, size: stored.size },
      ipAddress: req.ip ?? '',
    });

    return okResponse(
      'wiki.uploaded',
      {
        url: stored.url,
        assetId: asset.id,
        mimeType,
        size: stored.size,
      },
      `${req.method} ${req.path}`,
    );
  }
}
