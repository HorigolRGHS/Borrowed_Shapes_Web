import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { raw } from '@mikro-orm/core';
import { User } from '../entities/User';
import { GameProfile } from '../entities/GameProfile';
import { UserAchievement } from '../entities/UserAchievement';
import { Achievement } from '../entities/Achievement';
import { getEffectiveExpiresAt } from '../achievements/achievements.service';
import { AuditLog } from '../entities/AuditLog';
import { AuditActionType } from '../entities/AuditActionType';
import { UserOnlineStatus } from '../entities/UserOnlineStatus';
import { R2StorageService } from '../storage/r2-storage.service';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  AvatarUploadRequestDto,
  AvatarUploadResponseDto,
} from './dto/avatar-upload.dto';
import { randomUUID } from 'crypto';
import { UserSession } from '../entities/UserSession';
import { SessionStatus } from '../entities/SessionStatus';
import { getProxyAvatarUrl } from '../auth/auth-utils';
import { AdminDashboardStatisticsQueryDto, DashboardRange } from './dto/admin-dashboard-statistics-query.dto';
import { GameRun } from '../entities/GameRun';
import { GameSession } from '../entities/GameSession';
import { ForumThread } from '../entities/ForumThread';
import { ForumComment } from '../entities/ForumComment';

import {
  AdminAccountQueryDto,
  AccountFilterRole,
  AccountFilterStatus,
  AccountSortBy,
  SortOrder,
} from './dto/admin-account-query.dto';
import { AdminUpdateAccountProfileDto } from './dto/admin-update-account-profile.dto';
import { AdminBanAccountDto } from './dto/admin-ban-account.dto';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto';
import { AdminUpdateAccountRoleDto } from './dto/admin-update-account-role.dto';
import { AdminSystemAuditLogQueryDto } from './dto/admin-system-audit-log-query.dto';
import { AuthService } from '../auth/auth.service';
import { Role } from '../entities/Role';
import { EmailService } from '../email/email.service';

function maskSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(maskSensitiveData);
  }

  const result: any = {};
  const sensitiveKeys = [
    'password',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'sessionid',
    'authorization',
    'cookie',
    'secret',
    'googleid',
  ];

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = maskSensitiveData(value);
    }
  }
  return result;
}

@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private em: EntityManager,
    private storageService: R2StorageService,
    private configService: ConfigService,
    private authService: AuthService,
    private emailService: EmailService,
  ) { }

  private getPublicBaseUrl(): string {
    return this.configService
      .get<string>(
        'R2_PUBLIC_DEV_URL',
        'https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev',
      )
      .replace(/\/+$/, '');
  }

  private isValidAvatarKeyOrUrl(url: string, userId: string): boolean {
    if (url.startsWith(`avatars/${userId}/`)) return true;

    try {
      const parsedUrl = new URL(url);
      const parsedBase = new URL(this.getPublicBaseUrl());

      if (parsedUrl.origin !== parsedBase.origin) return false;

      const key = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));

      return key.startsWith('avatars/');
    } catch {
      return false;
    }
  }

  /**
   * Derive the R2 object key from a stored imgUrl.
   * Stored value can be:
   * - raw R2 key: avatars/{userId}/{file}
   * - old public R2 URL
   *
   * Returns null if the value does not belong to this project's R2 avatars.
   */
  private getAvatarKeyFromStoredValue(value?: string | null): string | null {
    if (!value) return null;

    if (value.startsWith('avatars/')) return value;

    try {
      const parsedUrl = new URL(value);
      const parsedBase = new URL(this.getPublicBaseUrl());

      if (parsedUrl.origin !== parsedBase.origin) return null;

      const key = decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ''));

      if (!key.startsWith('avatars/')) return null;

      return key;
    } catch {
      return null;
    }
  }

  async getAvatarStream(userId: string) {
    let user;
    if (userId === 'me') {
      throw new BadRequestException('Invalid userId');
    } else {
      user = await this.em.findOne(User, { id: userId });
    }

    if (!user || !user.imgUrl) {
      throw new NotFoundException('Avatar not found');
    }

    const key = this.getAvatarKeyFromStoredValue(user.imgUrl);
    if (!key) {
      // If it's a google URL or something else, we don't stream it from R2.
      // The frontend should not hit this endpoint for google URLs, but if it does, 404.
      throw new NotFoundException('Avatar not found in storage');
    }

    try {
      const { stream, contentType, contentLength } =
        await this.storageService.getObjectStream(key);
      return { stream, contentType, contentLength };
    } catch (e) {
      this.logger.error(`Failed to fetch avatar stream for ${userId}: ${e}`);
      throw new NotFoundException('Avatar not found');
    }
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    ipAddress: string,
  ) {
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
      if (
        dto.imgUrl !== null &&
        !this.isValidAvatarKeyOrUrl(dto.imgUrl, userId)
      ) {
        throw new BadRequestException('Invalid image URL');
      }

      user.imgUrl = dto.imgUrl ?? undefined;
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
            throw new ForbiddenException(
              'Achievement not unlocked or does not exist',
            );
          }
          const achievement = await this.em.findOne(Achievement, {
            id: dto.equippedAchievementId,
          });
          const expiresAt = getEffectiveExpiresAt(achievement?.type ?? '', achievement?.seasonMonth, achievement?.expiresAt);
          if (achievement?.type === 'SEASONAL' && expiresAt && expiresAt < new Date()) {
            throw new ForbiddenException('Achievement season has expired');
          }
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
      const oldKey = this.getAvatarKeyFromStoredValue(oldImgUrl);
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

    if (updatedGameProfile?.equippedAchievementId) {
      const achievement = updatedGameProfile.equippedAchievementId;
      const expiresAt = getEffectiveExpiresAt(
        achievement.type,
        achievement.seasonMonth,
        achievement.expiresAt,
      );
      if (achievement.type === 'SEASONAL' && expiresAt && expiresAt < new Date()) {
        updatedGameProfile.equippedAchievementId = undefined as any;
        await this.em.flush();
      }
    }

    return {
      id: user.id,
      email: String(user.email),
      displayName: String(user.displayName),
      imgUrl: getProxyAvatarUrl(user.imgUrl, user.id, user.updatedAt),
      role: user.role,
      isBanned: user.isBanned,
      gameProfileId: updatedGameProfile?.id,
      equippedAchievementId:
        updatedGameProfile?.equippedAchievementId?.id ?? null,
      equippedAchievement: updatedGameProfile?.equippedAchievementId
        ? {
          id: updatedGameProfile.equippedAchievementId.id,
          name: updatedGameProfile.equippedAchievementId.name,
          badgeImageUrl:
            updatedGameProfile.equippedAchievementId.badgeImageUrl,
          type: updatedGameProfile.equippedAchievementId.type,
        }
        : null,
    };
  }

  async getAvatarUploadUrl(
    userId: string,
    dto: AvatarUploadRequestDto,
  ): Promise<AvatarUploadResponseDto> {
    const maxSizeBytes = 2 * 1024 * 1024; // 2MB
    if (dto.fileSize > maxSizeBytes) {
      throw new BadRequestException('profile.edit.validation.avatar_too_large');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(dto.mimeType)) {
      throw new BadRequestException(
        'profile.edit.validation.avatar_invalid_type',
      );
    }

    const extByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    const ext = extByMime[dto.mimeType] ?? 'png';
    const uniqueId = randomUUID();
    const key = `avatars/${userId}/${uniqueId}.${ext}`;

    const uploadUrl = await this.storageService.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });
    return {
      uploadUrl,
      method: 'PUT',
      key,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }
  // ─── ADMIN ACCOUNT MANAGEMENT ──────────────────────────────

  async getAdminUsers(query: AdminAccountQueryDto) {
    const { page = 1, limit = 10, search, role, status, sortBy = AccountSortBy.CREATED_AT, sort = SortOrder.DESC } = query;
    const qb = this.em.createQueryBuilder(User, 'u');

    if (search) {
      qb.andWhere({
        $or: [
          { id: { $ilike: `%${search}%` } },
          { email: { $ilike: `%${search}%` } },
          { displayName: { $ilike: `%${search}%` } },
        ],
      });
    }

    if (role && role !== AccountFilterRole.ALL) {
      qb.andWhere({ role });
    }

    if (status && status !== AccountFilterStatus.ALL) {
      if (status === AccountFilterStatus.ACTIVE) {
        qb.andWhere({ deletedAt: null, isBanned: false });
      } else if (status === AccountFilterStatus.BANNED) {
        qb.andWhere({ deletedAt: null, isBanned: true });
      } else if (status === AccountFilterStatus.DELETED) {
        qb.andWhere({ deletedAt: { $ne: null } });
      }
    }

    if (sortBy === AccountSortBy.ROLE) {
      qb.orderBy({ role: sort, createdAt: 'DESC' });
    } else if (sortBy === AccountSortBy.STATUS) {
      qb.orderBy({
        [raw('CASE WHEN u."deletedAt" IS NOT NULL THEN 3 WHEN u."isBanned" = true THEN 2 ELSE 1 END')]: sort,
        createdAt: 'DESC'
      });
    } else if (sortBy === AccountSortBy.ONLINE_STATUS) {
      qb.orderBy({
        [raw('COALESCE((SELECT "isOnline" FROM auth."UserOnlineStatus" os WHERE os."userId" = u.id), false)')]: sort,
        createdAt: 'DESC'
      });
    } else {
      qb.orderBy({ createdAt: sort });
    }

    qb.limit(limit).offset((page - 1) * limit);

    const [users, total] = await qb.getResultAndCount();

    const userIds = users.map((u) => u.id);
    const onlineStatuses =
      userIds.length > 0
        ? await this.em.find(UserOnlineStatus, { userId: { $in: userIds } })
        : [];
    const statusMap = new Map(onlineStatuses.map((s) => [s.userId.id, s]));

    const items = users.map((u) => {
      const status = statusMap.get(u.id);
      const isOnline = status?.isOnline ?? false;
      const onlinePlatforms = (status?.onlinePlatforms as string[]) ?? [];
      const isWebOnline = isOnline && onlinePlatforms.includes('web');
      const isGameOnline = isOnline && onlinePlatforms.includes('game');

      return {
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        imgUrl: getProxyAvatarUrl(u.imgUrl, u.id, u.updatedAt),
        role: u.role,
        isBanned: u.isBanned,
        bannedAt: u.bannedAt,
        banReason: u.banReason,
        banExpiresAt: u.banExpiresAt,
        deletedAt: u.deletedAt,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        onlineStatus: {
          isOnline,
          lastOnline: status?.lastOnline ?? null,
          onlinePlatforms,
          isWebOnline,
          isGameOnline,
        },
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdminUserDetails(id: string) {
    const user = await this.em.findOne(User, { id });
    if (!user) throw new NotFoundException('User not found');

    const gameProfile = await this.em.findOne(
      GameProfile,
      { userId: id },
      { populate: ['equippedAchievementId'] },
    );

    if (gameProfile?.equippedAchievementId) {
      const achievement = gameProfile.equippedAchievementId;
      const expiresAt = getEffectiveExpiresAt(
        achievement.type,
        achievement.seasonMonth,
        achievement.expiresAt,
      );
      if (achievement.type === 'SEASONAL' && expiresAt && expiresAt < new Date()) {
        gameProfile.equippedAchievementId = undefined as any;
        await this.em.flush();
      }
    }

    let equippedAchievement = null;
    if (gameProfile?.equippedAchievementId) {
      equippedAchievement = {
        id: gameProfile.equippedAchievementId.id,
        name: gameProfile.equippedAchievementId.name,
        badgeImageUrl: gameProfile.equippedAchievementId.badgeImageUrl,
        type: gameProfile.equippedAchievementId.type,
      };
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      imgUrl: getProxyAvatarUrl(user.imgUrl, user.id, user.updatedAt),
      role: user.role,
      isBanned: user.isBanned,
      bannedAt: user.bannedAt,
      banReason: user.banReason,
      banExpiresAt: user.banExpiresAt,
      deletedAt: user.deletedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      gameProfile: gameProfile
        ? {
          id: gameProfile.id,
          totalPlayTime: Number(gameProfile.totalPlayTime || 0),
          totalSessions: gameProfile.totalSessions,
          totalWins: gameProfile.totalWins,
          totalLosses: gameProfile.totalLosses,
          totalAbandoned: gameProfile.totalAbandoned,
          equippedAchievementId:
            gameProfile.equippedAchievementId?.id || null,
          equippedAchievement,
        }
        : null,
    };
  }

  async getAdminUserAuditLogs(id: string, query: AdminAuditLogQueryDto) {
    const { page = 1, limit = 20 } = query;
    const qb = this.em.createQueryBuilder(AuditLog, 'a');
    qb.where({ userId: id })
      .orWhere({ entityName: 'User', entityId: id })
      .orderBy({ timestamp: 'DESC' })
      .limit(limit)
      .offset((page - 1) * limit);

    const [logs, total] = await qb.getResultAndCount();

    return {
      items: logs.map((log) => ({
        id: log.id,
        userId: log.userId?.id || null,
        actionType: log.actionType,
        entityName: log.entityName,
        entityId: log.entityId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        timestamp: log.timestamp,
        ipAddress: log.ipAddress,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSystemAuditLogs(query: AdminSystemAuditLogQueryDto) {
    const {
      page = 1,
      limit = 20,
      actionType,
      entityName,
      entityId,
      userId,
      search,
      from,
      to,
    } = query;

    const qb = this.em.createQueryBuilder(AuditLog, 'a');
    qb.leftJoinAndSelect('a.userId', 'u');

    if (actionType) {
      qb.andWhere({ actionType });
    }
    if (entityName) {
      qb.andWhere({ entityName });
    }
    if (entityId) {
      qb.andWhere({ entityId });
    }
    if (userId) {
      qb.andWhere({ userId });
    }
    if (from) {
      qb.andWhere({ timestamp: { $gte: new Date(from) } });
    }
    if (to) {
      qb.andWhere({ timestamp: { $lte: new Date(to) } });
    }
    if (search) {
      qb.andWhere({
        $or: [
          { 'u.email': { $ilike: `%${search}%` } },
          { 'u.displayName': { $ilike: `%${search}%` } },
          { entityName: { $ilike: `%${search}%` } },
          { entityId: { $ilike: `%${search}%` } },
        ],
      });
    }

    qb.orderBy({ timestamp: 'DESC' })
      .limit(limit)
      .offset((page - 1) * limit);

    const [logs, total] = await qb.getResultAndCount();

    return {
      items: logs.map((log) => {
        const actor = log.userId
          ? {
            id: log.userId.id,
            email: String(log.userId.email),
            displayName: String(log.userId.displayName),
            imgUrl: getProxyAvatarUrl(
              log.userId.imgUrl,
              log.userId.id,
              log.userId.updatedAt || new Date(),
            ),
          }
          : null;

        return {
          id: log.id,
          actor,
          actionType: log.actionType,
          entityName: log.entityName,
          entityId: log.entityId,
          oldValue: maskSensitiveData(log.oldValue),
          newValue: maskSensitiveData(log.newValue),
          timestamp: log.timestamp,
          ipAddress: log.ipAddress,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminUpdateProfile(
    adminId: string,
    targetUserId: string,
    dto: AdminUpdateAccountProfileDto,
    ipAddress: string,
  ) {
    const target = await this.em.findOne(User, { id: targetUserId });
    if (!target) throw new NotFoundException('User not found');

    const oldValues: Record<string, any> = {
      displayName: target.displayName,
      imgUrl: getProxyAvatarUrl(target.imgUrl, target.id, target.updatedAt),
    };

    let updated = false;

    if (
      dto.displayName !== undefined &&
      dto.displayName !== target.displayName
    ) {
      const trimmed = dto.displayName.trim();
      if (trimmed.length < 2 || trimmed.length > 50) {
        throw new BadRequestException('Invalid display name length');
      }
      target.displayName = trimmed;
      updated = true;
    }

    if (dto.imgUrl !== undefined && dto.imgUrl !== target.imgUrl) {
      if (
        dto.imgUrl !== null &&
        !this.isValidAvatarKeyOrUrl(dto.imgUrl, targetUserId)
      ) {
        throw new BadRequestException('Invalid image URL');
      }
      target.imgUrl = dto.imgUrl ?? undefined;
      updated = true;
    }

    if (updated) {
      target.updatedAt = new Date();

      const adminRef = this.em.getReference(User, adminId);
      const auditLog = this.em.create(AuditLog, {
        userId: adminRef,
        actionType: AuditActionType.UPDATE,
        entityName: 'User',
        entityId: target.id,
        oldValue: oldValues,
        newValue: {
          displayName: target.displayName,
          imgUrl: getProxyAvatarUrl(target.imgUrl, target.id, target.updatedAt),
        },
        ipAddress: ipAddress || null,
      });
      this.em.persist(auditLog);
      await this.em.flush();
    }

    return this.getAdminUserDetails(targetUserId);
  }

  async adminUpdateRole(
    adminId: string,
    targetUserId: string,
    dto: AdminUpdateAccountRoleDto,
    ipAddress: string,
  ) {
    const target = await this.em.findOne(User, { id: targetUserId });
    if (!target) throw new NotFoundException('User not found');
    if (target.deletedAt)
      throw new BadRequestException('Cannot update role for a deleted user');

    const oldRole = target.role;

    if (oldRole === dto.role) {
      return {
        id: target.id,
        email: target.email,
        displayName: target.displayName,
        imgUrl: getProxyAvatarUrl(
          target.imgUrl,
          target.id,
          target.updatedAt || new Date(),
        ),
        role: target.role,
        isBanned: target.isBanned,
        bannedAt: target.bannedAt ?? undefined,
        banReason: target.banReason ?? undefined,
        banExpiresAt: target.banExpiresAt ?? undefined,
        deletedAt: target.deletedAt ?? undefined,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
      };
    }

    if (
      adminId === targetUserId &&
      oldRole === Role.ADMIN &&
      dto.role === Role.USER
    ) {
      throw new ForbiddenException('admin.account.role.self_demote_blocked');
    }

    if (oldRole === Role.ADMIN && dto.role === Role.USER) {
      const adminCount = await this.em.count(User, {
        role: Role.ADMIN,
        deletedAt: null,
      });
      if (adminCount <= 1) {
        throw new BadRequestException('admin.account.role.last_admin_blocked');
      }
    }

    target.role = dto.role;

    const adminRef = this.em.getReference(User, adminId);
    this.em.create(AuditLog, {
      userId: adminRef,
      actionType: AuditActionType.UPDATE,
      entityName: 'User',
      entityId: targetUserId,
      oldValue: { role: oldRole },
      newValue: { role: dto.role },
      ipAddress,
    });

    await this.em.flush();

    // Revoke all active sessions so the user gets the new role upon next login
    try {
      await this.authService.revokeUserSessions(targetUserId);
    } catch (err: any) {
      this.logger.warn(
        `Failed to revoke sessions for user ${targetUserId} after role update: ${err.message}`,
      );
    }

    return {
      id: target.id,
      email: target.email,
      displayName: target.displayName,
      imgUrl: getProxyAvatarUrl(
        target.imgUrl,
        target.id,
        target.updatedAt || new Date(),
      ),
      role: target.role,
      isBanned: target.isBanned,
      bannedAt: target.bannedAt ?? undefined,
      banReason: target.banReason ?? undefined,
      banExpiresAt: target.banExpiresAt ?? undefined,
      deletedAt: target.deletedAt ?? undefined,
      createdAt: target.createdAt,
      updatedAt: target.updatedAt,
    };
  }

  async adminBanUser(
    adminId: string,
    targetUserId: string,
    dto: AdminBanAccountDto,
    ipAddress: string,
  ) {
    if (adminId === targetUserId) {
      throw new ForbiddenException('Cannot ban yourself');
    }

    const target = await this.em.findOne(User, { id: targetUserId });
    if (!target) throw new NotFoundException('User not found');

    if (target.deletedAt) {
      throw new BadRequestException('Cannot ban a deleted user');
    }

    if (target.role === 'ADMIN') {
      throw new ForbiddenException('Cannot ban another ADMIN user');
    }

    let expiresAt: Date | null = null;
    if (dto.banExpiresAt) {
      expiresAt = new Date(dto.banExpiresAt);
      if (expiresAt <= new Date()) {
        throw new BadRequestException('Ban expiration must be in the future');
      }
    }

    const oldValues = {
      isBanned: target.isBanned,
      bannedAt: target.bannedAt,
      banReason: target.banReason,
      banExpiresAt: target.banExpiresAt,
    };

    const hasChanged = !target.isBanned || target.banReason !== dto.reason.trim() || target.banExpiresAt?.getTime() !== expiresAt?.getTime();

    target.isBanned = true;
    target.bannedAt = new Date();
    target.banReason = dto.reason.trim();
    target.banExpiresAt = expiresAt ?? undefined;

    const adminRef = this.em.getReference(User, adminId);
    const auditLog = this.em.create(AuditLog, {
      userId: adminRef,
      actionType: AuditActionType.BAN_USER,
      entityName: 'User',
      entityId: target.id,
      oldValue: oldValues,
      newValue: {
        isBanned: target.isBanned,
        bannedAt: target.bannedAt,
        banReason: target.banReason,
        banExpiresAt: target.banExpiresAt,
      },
      ipAddress: ipAddress || null,
    });

    this.em.persist(auditLog);

    // Revoke all active sessions
    await this.em.nativeUpdate(
      UserSession,
      { userId: target.id, status: SessionStatus.ACTIVE },
      { status: SessionStatus.REVOKED, logoutTime: new Date() },
    );

    await this.em.flush();

    if (hasChanged && target.email) {
      try {
        await this.emailService.sendAccountBannedEmail({
          to: target.email as string,
          displayName: target.displayName,
          reason: dto.reason.trim(),
          banExpiresAt: expiresAt,
        });
      } catch (error) {
        this.logger.warn(`Failed to send ban notification email to user ${target.id}`);
      }
    }

    return this.getAdminUserDetails(targetUserId);
  }

  async adminUnbanUser(
    adminId: string,
    targetUserId: string,
    ipAddress: string,
  ) {
    const target = await this.em.findOne(User, { id: targetUserId });
    if (!target) throw new NotFoundException('User not found');

    if (target.deletedAt) {
      throw new BadRequestException('Cannot unban a deleted user');
    }

    const oldValues = {
      isBanned: target.isBanned,
      bannedAt: target.bannedAt,
      banReason: target.banReason,
      banExpiresAt: target.banExpiresAt,
    };

    const hasChanged = target.isBanned === true;

    target.isBanned = false;
    target.bannedAt = undefined;
    target.banReason = undefined;
    target.banExpiresAt = undefined;

    const adminRef = this.em.getReference(User, adminId);
    const auditLog = this.em.create(AuditLog, {
      userId: adminRef,
      actionType: AuditActionType.UNBAN_USER,
      entityName: 'User',
      entityId: target.id,
      oldValue: oldValues,
      newValue: {
        isBanned: target.isBanned,
        bannedAt: target.bannedAt,
        banReason: target.banReason,
        banExpiresAt: target.banExpiresAt,
      },
      ipAddress: ipAddress || null,
    });

    this.em.persist(auditLog);
    await this.em.flush();

    if (hasChanged && target.email) {
      try {
        await this.emailService.sendAccountUnbannedEmail({
          to: target.email as string,
          displayName: target.displayName,
        });
      } catch (error) {
        this.logger.warn(`Failed to send unban notification email to user ${target.id}`);
      }
    }

    return this.getAdminUserDetails(targetUserId);
  }

  async adminDeleteUser(
    adminId: string,
    targetUserId: string,
    ipAddress: string,
  ) {
    if (adminId === targetUserId) {
      throw new ForbiddenException('Cannot delete yourself');
    }

    const target = await this.em.findOne(User, { id: targetUserId });
    if (!target) throw new NotFoundException('User not found');

    if (target.role === 'ADMIN') {
      throw new ForbiddenException('Cannot delete another ADMIN user');
    }

    const oldValues = {
      deletedAt: target.deletedAt,
    };

    const hasChanged = !target.deletedAt;

    target.deletedAt = new Date();

    const adminRef = this.em.getReference(User, adminId);
    const auditLog = this.em.create(AuditLog, {
      userId: adminRef,
      actionType: AuditActionType.DELETE,
      entityName: 'User',
      entityId: target.id,
      oldValue: oldValues,
      newValue: {
        deletedAt: target.deletedAt,
      },
      ipAddress: ipAddress || null,
    });

    this.em.persist(auditLog);

    // Revoke all active sessions
    await this.em.nativeUpdate(
      UserSession,
      { userId: target.id, status: SessionStatus.ACTIVE },
      { status: SessionStatus.REVOKED, logoutTime: new Date() },
    );

    await this.em.flush();

    if (hasChanged && target.email) {
      try {
        await this.emailService.sendAccountDeletedEmail({
          to: target.email as string,
          displayName: target.displayName,
        });
      } catch (error) {
        this.logger.warn(`Failed to send deactivation notification email to user ${target.id}`);
      }
    }

    return this.getAdminUserDetails(targetUserId);
  }

  async adminRestoreUser(
    adminId: string,
    targetUserId: string,
    ipAddress: string,
  ) {
    if (adminId === targetUserId) {
      throw new ForbiddenException('Cannot restore yourself');
    }

    const target = await this.em.findOne(User, { id: targetUserId });
    if (!target) throw new NotFoundException('User not found');

    if (!target.deletedAt) {
      throw new BadRequestException('User is not deleted');
    }

    if (target.role === 'ADMIN') {
      throw new ForbiddenException('Cannot restore another ADMIN user');
    }

    const oldValues = {
      deletedAt: target.deletedAt,
    };

    target.deletedAt = null as any;

    const adminRef = this.em.getReference(User, adminId);
    const auditLog = this.em.create(AuditLog, {
      userId: adminRef,
      actionType: AuditActionType.UPDATE,
      entityName: 'User',
      entityId: target.id,
      oldValue: oldValues,
      newValue: {
        deletedAt: null,
        restored: true,
      },
      ipAddress: ipAddress || null,
    });

    this.em.persist(auditLog);
    await this.em.flush();

    return this.getAdminUserDetails(targetUserId);
  }

  async getDashboardStatistics(query: AdminDashboardStatisticsQueryDto) {
    let days = 30;
    if (query.range === DashboardRange.DAYS_7) days = 7;
    else if (query.range === DashboardRange.DAYS_90) days = 90;


    // Summary
    const [
      totalThreads,
      totalComments,
      totalGameRuns,
      totalGameSessions,
      completedRuns,
      totalUsers,
      totalPlayers,
      bannedUsers,
      newUsersInRange,
      downloadsResult,
      activeFileResult
    ] = await Promise.all([
      this.em.count(ForumThread, {}),
      this.em.count(ForumComment, { isDeleted: false }),
      this.em.count(GameRun, {}),
      this.em.count(GameSession, {}),
      this.em.count(GameRun, { isCompleted: true }),
      this.em.count(User, { deletedAt: null }),
      this.em.count(GameProfile, {}),
      this.em.count(User, { isBanned: true }),
      this.em.getConnection().execute(`SELECT count(*) as count FROM auth."User" WHERE "createdAt" >= NOW() - INTERVAL '${days} days'`),
      this.em.getConnection().execute(`SELECT count(*) as total, sum("bytesSent") as bytes FROM web."DownloadLog"`),
      this.em.getConnection().execute(`SELECT "fileVersion" FROM web."FileAsset" WHERE "isActive" = true LIMIT 1`)
    ]);

    const totalDownloads = Number(downloadsResult[0]?.total || 0);
    const totalBytesSent = Number(downloadsResult[0]?.bytes || 0);
    const activeFileVersion = activeFileResult[0]?.fileVersion || null;

    // Series queries
    const seriesSql = (table: string, dateCol: string, countCol: string = '*') => `
      SELECT date_trunc('day', "${dateCol}") as date, count(${countCol}) as count
      FROM ${table}
      WHERE "${dateCol}" >= NOW() - INTERVAL '${days} days'
      GROUP BY date_trunc('day', "${dateCol}")
      ORDER BY date ASC
    `;

    const [forumActivityRes, gameplayActivityRes, userGrowthRes, downloadTrendRes] = await Promise.all([
      this.em.getConnection().execute(seriesSql('web."ForumThread"', 'createdAt')),
      this.em.getConnection().execute(seriesSql('game."GameRun"', 'startedAt')),
      this.em.getConnection().execute(seriesSql('auth."User"', 'createdAt')),
      this.em.getConnection().execute(seriesSql('web."DownloadLog"', 'downloadedAt'))
    ]);

    // Fill missing days
    const generateSeries = (rawRes: any[]) => {
      const map = new Map(rawRes.map(r => [new Date(r.date).toISOString().split('T')[0], Number(r.count)]));
      const series = [];
      const now = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        series.push({
          label,
          date: dateStr,
          value: map.get(dateStr) || 0
        });
      }
      return series;
    };

    return {
      summary: {
        forum: {
          totalThreads,
          totalComments,
        },
        gameplay: {
          totalGameRuns,
          totalGameSessions,
          completedRuns,
        },
        players: {
          totalUsers,
          totalPlayers,
          newUsersInRange: Number(newUsersInRange[0]?.count || 0),
          bannedUsers,
        },
        downloads: {
          totalDownloads,
          totalBytesSent,
          activeFileVersion,
        }
      },
      series: {
        forumActivity: generateSeries(forumActivityRes),
        gameplayActivity: generateSeries(gameplayActivityRes),
        userGrowth: generateSeries(userGrowthRes),
        downloadTrend: generateSeries(downloadTrendRes),
      }
    };
  }
}
