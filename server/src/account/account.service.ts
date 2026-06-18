import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../entities/User';
import { GameProfile } from '../entities/GameProfile';
import { UserAchievement } from '../entities/UserAchievement';
import { Achievement } from '../entities/Achievement';
import { AuditLog } from '../entities/AuditLog';
import { AuditActionType } from '../entities/AuditActionType';
import { R2StorageService } from '../storage/r2-storage.service';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AvatarUploadRequestDto, AvatarUploadResponseDto } from './dto/avatar-upload.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private em: EntityManager,
    private storageService: R2StorageService,
    private configService: ConfigService,
  ) {}

  /**
   * Derive the R2 object key from a public avatar URL.
   * Returns null if the URL does not belong to this project's R2 avatars.
   */
  private getR2KeyFromPublicUrl(url?: string | null): string | null {
    if (!url) return null;

    const publicBaseUrl = this.configService.get<string>(
      'R2_PUBLIC_DEV_URL',
      'https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev',
    );

    try {
      const parsedUrl = new URL(url);
      const parsedBase = new URL(publicBaseUrl);

      if (parsedUrl.origin !== parsedBase.origin) return null;

      const key = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));

      // Only allow deleting avatar objects
      if (!key.startsWith('avatars/')) return null;

      return key;
    } catch {
      return null;
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto, ipAddress: string) {
    const user = await this.em.findOne(User, { id: userId });
    if (!user) throw new NotFoundException('User not found');

    const oldImgUrl: string | null = user.imgUrl ?? null;

    const oldValues: Record<string, any> = {
      displayName: user.displayName,
      imgUrl: user.imgUrl,
    };

    let updated = false;

    if (dto.displayName !== undefined && dto.displayName !== user.displayName) {
      user.displayName = dto.displayName as any;
      updated = true;
    }

    if (dto.imgUrl !== undefined && dto.imgUrl !== user.imgUrl) {
      if (dto.imgUrl !== null) {
        const publicUrlBase = this.configService.get(
          'R2_PUBLIC_DEV_URL',
          'https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev',
        );
        if (!dto.imgUrl.startsWith(publicUrlBase)) {
          throw new BadRequestException('Invalid image URL');
        }
      }
      user.imgUrl = dto.imgUrl;
      updated = true;
    }

    let gameProfile = await this.em.findOne(GameProfile, { userId });

    // Check equipped achievement if requested
    if (dto.equippedAchievementId !== undefined) {
      if (!gameProfile) {
        gameProfile = this.em.create(GameProfile, { userId: user });
        await this.em.persistAndFlush(gameProfile);
      }

      const oldEquipped = gameProfile.equippedAchievementId?.id;

      if (dto.equippedAchievementId === null) {
        if (oldEquipped) {
          gameProfile.equippedAchievementId = undefined as any;
          updated = true;
          oldValues['equippedAchievementId'] = oldEquipped;
        }
      } else {
        if (dto.equippedAchievementId !== oldEquipped) {
          const unlocked = await this.em.findOne(UserAchievement, {
            gameProfileId: gameProfile.id,
            achievementId: dto.equippedAchievementId,
          });
          if (!unlocked) {
            throw new ForbiddenException('Achievement not unlocked or does not exist');
          }
          const achievement = await this.em.findOne(Achievement, { id: dto.equippedAchievementId });
          gameProfile.equippedAchievementId = achievement as any;
          updated = true;
          oldValues['equippedAchievementId'] = oldEquipped;
        }
      }
    }

    if (updated) {
      const auditLog = this.em.create(AuditLog, {
        userId: user,
        actionType: AuditActionType.UPDATE,
        entityName: 'User',
        entityId: user.id,
        oldValue: oldValues,
        newValue: {
          displayName: user.displayName,
          imgUrl: user.imgUrl,
          equippedAchievementId: gameProfile?.equippedAchievementId?.id,
        },
        ipAddress,
      });
      await this.em.flush();
      void auditLog;
    }

    // After DB save succeeded, cleanup old avatar on R2 if it changed
    if (dto.imgUrl !== undefined && oldImgUrl && oldImgUrl !== dto.imgUrl) {
      const oldKey = this.getR2KeyFromPublicUrl(oldImgUrl);
      if (oldKey) {
        try {
          await this.storageService.deleteObject(oldKey);
          this.logger.log(`Deleted old avatar: ${oldKey}`);
        } catch (error) {
          this.logger.warn(`Failed to delete old avatar ${oldKey}: ${error}`);
        }
      }
    }

    const updatedGameProfile = await this.em.findOne(
      GameProfile,
      { userId: user.id },
      { populate: ['equippedAchievementId'] },
    );

    return {
      id: user.id,
      email: String(user.email),
      displayName: String(user.displayName),
      imgUrl: user.imgUrl ?? null,
      role: user.role,
      isBanned: user.isBanned,
      gameProfileId: updatedGameProfile?.id,
      equippedAchievementId: updatedGameProfile?.equippedAchievementId?.id ?? null,
      equippedAchievement: updatedGameProfile?.equippedAchievementId
        ? {
            id: updatedGameProfile.equippedAchievementId.id,
            name: updatedGameProfile.equippedAchievementId.name,
            badgeImageUrl: updatedGameProfile.equippedAchievementId.badgeImageUrl,
            type: updatedGameProfile.equippedAchievementId.type,
          }
        : null,
    };
  }

  async getAvatarUploadUrl(userId: string, dto: AvatarUploadRequestDto): Promise<AvatarUploadResponseDto> {
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB
    if (dto.fileSize > maxSizeBytes) {
      throw new BadRequestException('profile.edit.validation.avatar_too_large');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(dto.mimeType)) {
      throw new BadRequestException('profile.edit.validation.avatar_invalid_type');
    }

    const ext = dto.fileName.split('.').pop() || 'png';
    const uniqueId = randomUUID();
    const key = `avatars/${userId}/${uniqueId}.${ext}`;

    const uploadUrl = await this.storageService.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    const publicUrlBase = this.configService.get(
      'R2_PUBLIC_DEV_URL',
      'https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev',
    );

    return {
      uploadUrl,
      method: 'PUT',
      key,
      publicUrl: `${publicUrlBase}/${key}`,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }
}
