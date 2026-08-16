import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UnlockAchievementResponseDto } from './dto/unlock-achievement.dto';
import { Achievement } from '../entities/Achievement';
import { getProxyMediaUrl } from '../storage/media-utils';
import { getProxyAvatarUrl } from '../auth/auth-utils';
import { UserAchievement } from '../entities/UserAchievement';
import { CreateAchievementDto } from './dto/create-achievements.dto';
import { UpdateAchievementDto } from './dto/update-achievements.dto';
import { AchievementUploadUrlDto } from './dto/achievement-upload-url.dto';
import { AchievementConfirmUploadDto } from './dto/achievement-confirm-upload.dto';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';
import { randomUUID } from 'node:crypto';
import { AchievementRepository } from './repositories/achievements.repository';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../entities/AuditActionType';

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function getEffectiveExpiresAt(
  type: string,
  seasonMonth?: string | Date | null,
  expiresAt?: Date | string | null,
): Date | null {
  if (type !== 'SEASONAL') {
    return expiresAt ? new Date(expiresAt) : null;
  }

  if (seasonMonth) {
    const date = new Date(seasonMonth);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    // Expires at 23:59:59 Vietnam time (UTC+7) = 16:59:59 UTC
    return new Date(Date.UTC(year, month + 2, 0, 16, 59, 59, 999));
  }

  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  // Expires at 23:59:59 Vietnam time (UTC+7) = 16:59:59 UTC
  return new Date(Date.UTC(year, month + 2, 0, 16, 59, 59, 999));
}

@Injectable()
export class AchievementService {
  constructor(
    private readonly achievementRepository: AchievementRepository,
    private readonly r2: R2StorageService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<Achievement[]> {
    return this.achievementRepository.findAll();
  }

  async findAllWithEarnedCount(): Promise<
    Array<Achievement & { earnedCount: number }>
  > {
    return this.achievementRepository.searchWithEarnedCount('');
  }

  async findAllPaginated(query: {
    page?: number;
    limit?: number;
    type?: string;
    q?: string;
    sortBy?: string;
    order?: string;
  }): Promise<{
    items: Array<Achievement & { earnedCount: number }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { items, total } =
      await this.achievementRepository.findPaginatedWithEarnedCount(query);
    const limit = Math.max(1, Number(query.limit || 6));
    const page = Math.max(1, Number(query.page || 1));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string): Promise<Achievement & { earnedCount: number }> {
    const achievement = await this.achievementRepository.findOne(id);
    if (!achievement) {
      throw new NotFoundException('achievements.not_found');
    }
    const earnedCount =
      await this.achievementRepository.countUserAchievements(id);
    return Object.assign(achievement, { earnedCount });
  }

  async findByUser(gameProfileId: string): Promise<UserAchievement[]> {
    return this.achievementRepository.findUserAchievements(gameProfileId);
  }

  async checkNextMonthTopAchievements(): Promise<boolean> {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const seasonMonthString = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

    const count = await this.achievementRepository.count({
      seasonMonth: seasonMonthString,
      criteriaCode: { $like: 'SEASON_TOP_%' },
    });
    
    return count >= 5;
  }

  async create(
    dto: CreateAchievementDto,
    authorId?: string,
    ipAddress?: string,
  ): Promise<null> {
    if (dto.type !== 'SEASONAL') {
      const existing = await this.achievementRepository.findOneByCriteria(
        dto.criteriaCode,
      );
      if (existing) {
        throw new BadRequestException('achievements.already_exists');
      }
    }

    const achievement = this.achievementRepository.createAchievement({
      ...dto,
      id: dto.id || randomUUID(),
      seasonMonth: dto.seasonMonth ? `${dto.seasonMonth}-01` : null,
      expiresAt: dto.seasonMonth
        ? (() => {
            const [year, month] = dto.seasonMonth.split('-').map(Number);
            // End of next month at 23:59:59 Vietnam time (UTC+7) = 16:59:59 UTC
            return new Date(Date.UTC(year, month + 1, 0, 16, 59, 59, 999));
          })()
        : dto.expiresAt
          ? new Date(dto.expiresAt)
          : undefined,
    });

    await this.auditService.recordInCurrentUnitOfWork({
      userId: authorId,
      actionType: AuditActionType.CREATE,
      entityName: 'Achievement',
      entityId: achievement.id,
      newValue: {
        name: achievement.name,
        criteriaCode: achievement.criteriaCode,
      },
      ipAddress,
    });

    await this.achievementRepository.persistAndFlush(achievement);
    return null;
  }

  async update(
    id: string,
    dto: UpdateAchievementDto,
    authorId?: string,
    ipAddress?: string,
  ): Promise<null> {
    const achievement = await this.findOne(id);
    if (dto.criteriaCode) {
      const type = dto.type ?? achievement.type;
      if (type !== 'SEASONAL') {
        const existing =
          await this.achievementRepository.findOneByCriteriaExcludeId(
            dto.criteriaCode,
            id,
          );
        if (existing) {
          throw new BadRequestException('achievements.already_exists');
        }
      }
    }
    const { id: _, ...updateData } = dto as any;
    this.achievementRepository.assign(achievement, {
      ...updateData,
      seasonMonth: dto.seasonMonth ? `${dto.seasonMonth}-01` : null,
      expiresAt: dto.seasonMonth
        ? (() => {
            const [year, month] = dto.seasonMonth.split('-').map(Number);
            // End of next month at 23:59:59 Vietnam time (UTC+7) = 16:59:59 UTC
            return new Date(Date.UTC(year, month + 1, 0, 16, 59, 59, 999));
          })()
        : dto.expiresAt
          ? new Date(dto.expiresAt)
          : undefined,
    });

    await this.auditService.recordInCurrentUnitOfWork({
      userId: authorId,
      actionType: AuditActionType.UPDATE,
      entityName: 'Achievement',
      entityId: achievement.id,
      newValue: {
        name: achievement.name,
        criteriaCode: achievement.criteriaCode,
      },
      ipAddress,
    });

    await this.achievementRepository.flush();
    return null;
  }

  async delete(
    id: string,
    authorId?: string,
    ipAddress?: string,
  ): Promise<void> {
    const achievement = await this.findOne(id);

    // Set equippedAchievementId to null for any game profile that equipped it
    const profiles =
      await this.achievementRepository.findGameProfilesWithEquippedAchievements();
    for (const profile of profiles) {
      if (profile.equippedAchievementId?.id === id) {
        profile.equippedAchievementId = undefined;
      }
    }
    await this.achievementRepository.flush();

    if (achievement.badgeImageUrl) {
      const key = this.extractR2Key(achievement.badgeImageUrl);
      if (key) {
        try {
          await this.r2.deleteObject(key);
        } catch (err) {
          console.error(`Failed to delete R2 object for key ${key}:`, err);
        }
      }
    }

    await this.auditService.recordInCurrentUnitOfWork({
      userId: authorId,
      actionType: AuditActionType.DELETE,
      entityName: 'Achievement',
      entityId: achievement.id,
      oldValue: {
        name: achievement.name,
        criteriaCode: achievement.criteriaCode,
      },
      ipAddress,
    });

    await this.achievementRepository.removeAndFlush(achievement);
  }

  async createUploadUrl(dto: AchievementUploadUrlDto) {
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (dto.fileSize > maxFileSize) {
      throw new BadRequestException('achievements.upload_too_large');
    }

    const ext = MIME_EXT_MAP[dto.mimeType];
    if (!ext) {
      throw new BadRequestException('achievements.upload_invalid_type');
    }

    const key = `achievement/${dto.achievementId}/${randomUUID()}${ext}`;

    const uploadUrl = await this.r2.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    const base =
      this.config.get<string>('R2_PUBLIC_BASE_URL') ??
      this.config.getOrThrow<string>('R2_PUBLIC_DEV_URL');
    const publicBaseUrl = base.replace(/\/+$/, '');

    return {
      uploadUrl,
      key,
      publicUrl: getProxyMediaUrl(key) as string,
      method: 'PUT' as const,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }

  async confirmUpload(dto: AchievementConfirmUploadDto) {
    const expectedPrefix = `achievement/${dto.achievementId}/`;
    if (!dto.filePath.startsWith(expectedPrefix)) {
      throw new BadRequestException('achievements.invalid_file_path');
    }

    const exists = await this.r2.objectExists(dto.filePath);
    if (!exists) {
      throw new NotFoundException('achievements.file_not_found_on_storage');
    }

    const base =
      this.config.get<string>('R2_PUBLIC_BASE_URL') ??
      this.config.getOrThrow<string>('R2_PUBLIC_DEV_URL');
    const publicBaseUrl = base.replace(/\/+$/, '');
    const publicUrl = `${publicBaseUrl}/${dto.filePath}`;

    if (dto.oldBadgeImageUrl) {
      const oldKey = this.extractR2Key(dto.oldBadgeImageUrl);
      if (oldKey && oldKey !== dto.filePath) {
        try {
          await this.r2.deleteObject(oldKey);
        } catch (err) {
          console.error(
            `Failed to delete old R2 badge for key ${oldKey}:`,
            err,
          );
        }
      }
    }

    const achievement = await this.achievementRepository.findOne(
      dto.achievementId,
    );
    if (achievement) {
      achievement.badgeImageUrl = publicUrl;
      await this.achievementRepository.flush();
    }

    return { url: publicUrl };
  }

  private extractR2Key(url: string): string | null {
    const match = url.match(/(achievement\/[\w.\-]+(?:\/[\w.\-]+)?)$/);
    return match ? match[1] : null;
  }

  async search(
    query: string,
  ): Promise<Array<Achievement & { earnedCount: number }>> {
    query = query?.trim();
    if (!query) {
      return [];
    }
    return this.achievementRepository.searchWithEarnedCount(query);
  }

  async findUsersByAchievement(achievementId: string) {
    const rows =
      await this.achievementRepository.findUsersByAchievementDetailed(
        achievementId,
      );
    return (rows || []).map((row: any) => ({
      id: row.gameProfileId,
      displayName: row.displayName,
      avatarUrl: getProxyAvatarUrl(row.avatarUrl, row.userId, row.updatedAt) ?? undefined,
      equippedFrameUrl: row.equippedFrameUrl ? getProxyMediaUrl(row.equippedFrameUrl) ?? undefined : undefined,
      earnedAt: row.earnedAt,
    }));
  }

  async findShowcaseForUser(gameProfileId: string) {
    const now = new Date();
    const rows =
      await this.achievementRepository.findShowcaseRows(gameProfileId);

    const permanent: any[] = [];
    const seasonMap = new Map<
      string,
      {
        seasonKey: string;
        expiresAt: string | null;
        isActive: boolean;
        achievements: any[];
      }
    >();

    let totalEarned = 0;
    let permanentEarned = 0;
    let seasonalEarned = 0;

    for (const row of rows || []) {
      const owned = !!row.achievedAt;
      const isPermanent = row.type === 'PERMANENT';
      const expiresAt = getEffectiveExpiresAt(
        row.type,
        row.seasonMonth,
        row.expiresAt,
      );
      const isExpired = expiresAt ? expiresAt < now : false;
      const equippable = owned && (!isExpired || isPermanent);

      if (owned) {
        totalEarned++;
        if (isPermanent) permanentEarned++;
        else seasonalEarned++;
      }

      const item = {
        id: row.id,
        name: row.name,
        description: row.description,
        criteriaCode: row.criteriaCode,
        badgeImageUrl: getProxyMediaUrl(row.badgeImageUrl),
        type: row.type,
        seasonMonth: row.seasonMonth,
        expiresAt: expiresAt,
        owned,
        achievedAt: row.achievedAt ?? null,
        equippable,
      };

      if (isPermanent) {
        permanent.push(item);
      } else {
        const originalExpires = row.expiresAt ? new Date(row.expiresAt) : null;
        const isSeasonEnded = originalExpires ? originalExpires < now : false;
        if (!owned && isSeasonEnded) continue;

        const seasonKey = row.seasonMonth
          ? String(row.seasonMonth).slice(0, 7)
          : 'unknown';

        if (!seasonMap.has(seasonKey)) {
          seasonMap.set(seasonKey, {
            seasonKey,
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            isActive: !isExpired,
            achievements: [],
          });
        }
        seasonMap.get(seasonKey)!.achievements.push(item);
      }
    }

    return {
      permanent,
      seasonal: Array.from(seasonMap.values()),
      stats: { totalEarned, permanentEarned, seasonalEarned },
    };
  }

  async unlock(
    gameProfileId: string,
    criteriaCode: string,
  ): Promise<UnlockAchievementResponseDto> {
    const achievement =
      await this.achievementRepository.findOneByCriteria(criteriaCode);
    if (!achievement) throw new NotFoundException('achievements.not_found');

    const existingUnlock =
      await this.achievementRepository.findOneUserAchievement(
        gameProfileId,
        achievement.id,
      );

    if (existingUnlock)
      throw new BadRequestException('achievements.already_unlocked');

    const userAchievement = this.achievementRepository.createUserAchievement({
      gameProfileId,
      achievementId: achievement.id,
    });

    await this.achievementRepository.persistAndFlush(userAchievement);

    return {
      unlocked: true,
      achievement: {
        id: achievement.id,
        name: achievement.name,
        badgeImageUrl: achievement.badgeImageUrl,
      },
    };
  }
}
