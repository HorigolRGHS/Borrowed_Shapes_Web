import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';
import { FileAsset } from '../entities/FileAsset';
import { DownloadLog } from '../entities/DownloadLog';
import { DownloadStats } from '../entities/DownloadStats';
import { User } from '../entities/User';
import { AuditLog } from '../entities/AuditLog';
import { AuditActionType } from '../entities/AuditActionType';
import { GameVersionQueryDto } from './dto/game-version-query.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { DownloadHistoryQueryDto } from './dto/download-history-query.dto';

@Injectable()
export class DownloadsService {
  private readonly logger = new Logger(DownloadsService.name);
  private readonly signedUrlExpires: number;

  constructor(
    private readonly em: EntityManager,
    private readonly r2: R2StorageService,
    private readonly configService: ConfigService,
  ) {
    this.signedUrlExpires = this.configService.get<number>(
      'R2_SIGNED_URL_EXPIRES',
      300,
    );
  }

  // ─── 1. List game versions ───────────────────────────────
  async listVersions(query: GameVersionQueryDto) {
    const { page = 1, limit = 10, search, sortBy = 'uploadedAt', sort = 'desc', version } = query;
    const offset = (page - 1) * limit;

    const allowedSortBy = ['uploadedAt', 'fileVersion', 'fileSize', 'downloadCount'];
    const validSortBy = allowedSortBy.includes(sortBy) ? sortBy : 'uploadedAt';
    const sortDirection = sort === 'asc' ? 'ASC' : 'DESC';

    const knex = this.em.getConnection().getKnex();

    // Base query for counting
    const countQuery = knex('web.FileAsset as f').count('* as total');

    // Base query for data
    const dataQuery = knex('web.FileAsset as f')
      .select([
        'f.id',
        'f.fileName',
        'f.fileVersion',
        'f.fileSize',
        'f.mimeType',
        'f.isActive',
        'f.uploadedAt',
        'f.updatedAt',
        knex.raw('COALESCE(ds."downloadCount", 0)::int AS "downloadCount"')
      ])
      .leftJoin(
        knex.raw(`(
          SELECT "fileAssetId", COALESCE(SUM("downloadCount"), 0)::int AS "downloadCount"
          FROM web."DownloadStats"
          GROUP BY "fileAssetId"
        ) as ds`),
        'ds.fileAssetId',
        'f.id'
      )
      .limit(limit)
      .offset(offset);

    if (search) {
      countQuery.where('f.fileName', 'ilike', `%${search}%`);
      dataQuery.where('f.fileName', 'ilike', `%${search}%`);
    }

    if (version) {
      countQuery.where('f.fileVersion', version);
      dataQuery.where('f.fileVersion', version);
    }

    if (validSortBy === 'downloadCount') {
      dataQuery.orderBy('downloadCount', sortDirection);
      dataQuery.orderBy('f.uploadedAt', 'DESC');
    } else {
      dataQuery.orderBy(`f.${validSortBy}`, sortDirection);
    }

    const [[countResult], items] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    const total = Number(countResult.total);

    // Determine latest version (most recently uploaded)
    const latestId = total > 0 ? await this.getLatestVersionId() : null;

    return {
      items: items.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        fileVersion: f.fileVersion,
        fileSize: Number(f.fileSize),
        mimeType: f.mimeType,
        isActive: f.isActive,
        uploadedAt: f.uploadedAt,
        updatedAt: f.updatedAt,
        downloadCount: Number(f.downloadCount || 0),
        isLatest: f.id === latestId,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private async getLatestVersionId(): Promise<string | null> {
    const latest = await this.em
      .createQueryBuilder(FileAsset, 'f')
      .select('id')
      .orderBy({ uploadedAt: 'DESC' })
      .limit(1)
      .getSingleResult();
    return latest?.id ?? null;
  }

  // ─── Active Version Management ───────────────────────────────
  async getActiveVersion() {
    let active = await this.em.findOne(FileAsset, { isActive: true });
    
    if (!active) {
      // Fallback to latest
      active = await this.em
        .createQueryBuilder(FileAsset, 'f')
        .orderBy({ uploadedAt: 'DESC' })
        .limit(1)
        .getSingleResult();
    }

    if (!active) return null;

    return {
      id: active.id,
      fileName: active.fileName,
      fileVersion: active.fileVersion,
      fileSize: Number(active.fileSize),
      mimeType: active.mimeType,
      isActive: active.isActive,
      uploadedAt: active.uploadedAt,
      updatedAt: active.updatedAt,
    };
  }

  async setActiveVersion(id: string, adminUser: { userId: string }) {
    return await this.em.transactional(async (em) => {
      const target = await em.findOneOrFail(FileAsset, { id });
      const previousActive = await em.findOne(FileAsset, { isActive: true });

      if (previousActive?.id !== target.id) {
        // Set all to false
        await em.nativeUpdate(FileAsset, {}, { isActive: false });
        
        // Set target to true
        target.isActive = true;
        await em.persistAndFlush(target);

        // Record AuditLog
        const log = em.create(AuditLog, {
          userId: adminUser.userId,
          actionType: AuditActionType.UPDATE,
          entityName: 'FileAsset',
          entityId: target.id,
          oldValue: previousActive ? { id: previousActive.id, fileVersion: previousActive.fileVersion } : null,
          newValue: { id: target.id, fileVersion: target.fileVersion },
        });
        await em.persistAndFlush(log);
      }

      return {
        id: target.id,
        fileName: target.fileName,
        fileVersion: target.fileVersion,
        isActive: target.isActive,
      };
    });
  }

  // ─── 2. Request download ─────────────────────────────────
  /**
   * Creates a presigned download URL and records download metadata.
   * Actual transfer tracking requires an external service such as
   * Cloudflare Worker or R2 analytics. Current backend records
   * download request metadata only.
   */
  async requestDownload(
    fileAssetId: string,
    userId: string | null,
    clientIp: string,
  ) {
    const file = await this.em.findOne(FileAsset, { id: fileAssetId });
    if (!file) {
      throw new NotFoundException('downloads.version_not_found');
    }

    // Verify the object actually exists on R2
    const exists = await this.r2.objectExists(file.filePath);
    if (!exists) {
      throw new NotFoundException('downloads.file_not_found_on_storage');
    }

    // Create presigned download URL
    const downloadUrl = await this.r2.createDownloadUrl(
      file.filePath,
      file.fileName,
    );

    // Record download log (only for authenticated users)
    if (userId) {
      const log = this.em.create(DownloadLog, {
        userId: this.em.getReference(User, userId),
        fileAssetId: this.em.getReference(FileAsset, file.id),
        // bytesSent = file.fileSize for schema compatibility only.
        // This is NOT actual streamed bytes — it is the file size snapshot
        // at the time the signed URL was created.
        bytesSent: file.fileSize,
        clientIp,
      });
      this.em.persist(log);
    }

    // Upsert download stats for today
    await this.upsertDownloadStats(file);

    await this.em.flush();

    return {
      downloadUrl,
      expiresIn: this.signedUrlExpires,
      fileName: file.fileName,
      fileVersion: file.fileVersion,
      fileSize: Number(file.fileSize),
    };
  }

  private async upsertDownloadStats(file: FileAsset) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const existing = await this.em.findOne(DownloadStats, {
      fileAssetId: this.em.getReference(FileAsset, file.id),
      date: today,
    });

    if (existing) {
      // downloadCount and totalBytesSent represent request counts and
      // estimated total requested download size — NOT actual R2 bandwidth.
      existing.downloadCount = existing.downloadCount + 1n;
      existing.totalBytesSent = existing.totalBytesSent + file.fileSize;
    } else {
      const stats = this.em.create(DownloadStats, {
        fileAssetId: this.em.getReference(FileAsset, file.id),
        date: today,
        downloadCount: 1n,
        totalBytesSent: file.fileSize,
      });
      this.em.persist(stats);
    }
  }

  // ─── 3. Download history ─────────────────────────────────
  async getHistory(userId: string, query: DownloadHistoryQueryDto) {
    const { page = 1, limit = 10, search, version, fromDate, toDate, sort = 'desc' } = query;
    const offset = (page - 1) * limit;

    const qb = this.em.createQueryBuilder(DownloadLog, 'dl');
    qb.leftJoinAndSelect('dl.fileAssetId', 'f');
    qb.andWhere({ userId: this.em.getReference(User, userId) });

    if (search) {
      qb.andWhere({ 'f.fileName': { $ilike: `%${search}%` } });
    }
    if (version) {
      qb.andWhere({ 'f.fileVersion': version });
    }
    if (fromDate) {
      qb.andWhere({ downloadedAt: { $gte: new Date(fromDate) } });
    }
    if (toDate) {
      // Include the entire "toDate" day
      const endDate = new Date(toDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere({ downloadedAt: { $lt: endDate } });
    }

    const countQb = qb.clone();
    qb.orderBy({ downloadedAt: sort === 'asc' ? 'ASC' : 'DESC' })
      .limit(limit)
      .offset(offset);

    const [items, total] = await Promise.all([
      qb.getResultList(),
      countQb.getCount(),
    ]);

    // Summary stats (raw SQL to avoid quoting issues)
    const summaryResult = await this.em.getConnection().execute(
      `
      SELECT 
        COUNT(dl."id")::bigint AS "totalDownloads",
        COALESCE(SUM(dl."bytesSent"), 0)::bigint AS "totalDownloadSize"
      FROM web."DownloadLog" dl
      WHERE dl."userId" = ?
      `,
      [userId]
    );
    const summary = summaryResult[0] ?? {
      totalDownloads: '0',
      totalDownloadSize: '0',
    };

    const latestId = total > 0 ? await this.getLatestVersionId() : null;

    return {
      items: items.map((dl) => {
        const f = dl.fileAssetId as FileAsset;
        return {
          id: dl.id,
          fileAssetId: f.id,
          fileName: f.fileName,
          version: f.fileVersion,
          fileSize: Number(f.fileSize),
          downloadSize: Number(dl.bytesSent),
          mimeType: f.mimeType,
          downloadDate: dl.downloadedAt,
          uploadedAt: f.uploadedAt,
          isLatest: f.id === latestId,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalDownloads: Number(summary.totalDownloads),
        totalDownloadSize: Number(summary.totalDownloadSize),
      },
    };
  }

  // ─── 4. Create upload URL (Admin) ────────────────────────
  async createUploadUrl(dto: CreateUploadUrlDto) {
    const fileVersion = dto.fileVersion?.trim();
    if (!fileVersion) {
      throw new BadRequestException('Invalid version');
    }

    // Check version uniqueness before creating URL
    const existing = await this.em.findOne(FileAsset, {
      fileVersion,
    });
    if (existing) {
      throw new ConflictException({
        code: 'FILE_VERSION_EXISTS',
        message: `Version ${fileVersion} already exists. Please use another version.`,
        details: { fileVersion },
      });
    }

    // Sanitize file name — block path traversal
    const safeFileName = dto.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (
      safeFileName.includes('..') ||
      safeFileName.startsWith('/') ||
      safeFileName.startsWith('\\')
    ) {
      throw new BadRequestException('downloads.invalid_file_name');
    }

    const key = `game/windows/${fileVersion}/${safeFileName}`;

    const uploadUrl = await this.r2.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    return {
      uploadUrl,
      key,
      expiresIn: this.signedUrlExpires,
      method: 'PUT' as const,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }

  // ─── 5. Confirm upload (Admin) ───────────────────────────
  async confirmUpload(dto: ConfirmUploadDto) {
    const fileVersion = dto.fileVersion?.trim();
    if (!fileVersion) {
      throw new BadRequestException('Invalid version');
    }

    const expectedPrefix = `game/windows/${fileVersion}/`;
    if (!dto.filePath.startsWith(expectedPrefix)) {
      throw new BadRequestException('downloads.invalid_file_path');
    }

    // Check version uniqueness
    const existing = await this.em.findOne(FileAsset, {
      fileVersion,
    });
    if (existing) {
      throw new ConflictException({
        code: 'FILE_VERSION_EXISTS',
        message: `Version ${fileVersion} already exists. Please use another version.`,
        details: { fileVersion },
      });
    }

    // Verify the object actually exists on R2
    const exists = await this.r2.objectExists(dto.filePath);
    if (!exists) {
      throw new NotFoundException('downloads.file_not_found_on_storage');
    }

    // Optionally verify content length matches
    try {
      const meta = await this.r2.getObjectMetadata(dto.filePath);
      if (meta.contentLength > 0 && Math.abs(meta.contentLength - dto.fileSize) > 1024) {
        this.logger.warn(
          `File size mismatch: expected ${dto.fileSize}, got ${meta.contentLength} for ${dto.filePath}`,
        );
      }
    } catch {
      // Non-blocking; continue with the reported size
    }

    const fileAsset = this.em.create(FileAsset, {
      fileName: dto.fileName,
      fileVersion,
      filePath: dto.filePath,
      fileSize: BigInt(dto.fileSize),
      mimeType: dto.mimeType,
      isActive: false,
    });

    try {
      await this.em.persistAndFlush(fileAsset);
    } catch (error: any) {
      if (error.name === 'UniqueConstraintViolationException' || error.code === '23505') {
        // Cleanup the object on R2 if it was just uploaded and DB insert failed
        try {
          await this.r2.deleteObject(dto.filePath);
          this.logger.log(`Cleaned up duplicate file from R2: ${dto.filePath}`);
        } catch (cleanupError) {
          this.logger.warn(`Failed to cleanup duplicate file ${dto.filePath} from R2: ${cleanupError}`);
        }

        throw new ConflictException({
          code: 'FILE_VERSION_EXISTS',
          message: `Version ${fileVersion} already exists. Please use another version.`,
          details: { fileVersion },
        });
      }
      throw error;
    }

    return {
      id: fileAsset.id,
      fileName: fileAsset.fileName,
      fileVersion: fileAsset.fileVersion,
      fileSize: Number(fileAsset.fileSize),
      mimeType: fileAsset.mimeType,
      uploadedAt: fileAsset.uploadedAt,
    };
  }
}
