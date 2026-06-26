import { ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '../entities/User';
import { AuditLog } from '../entities/AuditLog';
import { AuditActionType } from '../entities/AuditActionType';

export async function ensureAccountActive(user: User, em: EntityManager): Promise<void> {
  if (user.deletedAt) {
    throw new ForbiddenException({
      code: 'ACCOUNT_DELETED',
      message: 'Your account has been deleted.',
      deleted: {
        deletedAt: user.deletedAt.toISOString(),
        reason: 'ACCOUNT_DELETED',
      },
    });
  }

  if (user.isBanned) {
    const currentTime = new Date();
    if (user.banExpiresAt && user.banExpiresAt <= currentTime) {
      const oldBannedAt = user.bannedAt;
      const oldBanReason = user.banReason;
      const oldBanExpiresAt = user.banExpiresAt;

      user.isBanned = false as any;
      user.bannedAt = undefined;
      user.banReason = undefined;
      user.banExpiresAt = undefined;

      const auditLog = em.create(AuditLog, {
        userId: null,
        actionType: AuditActionType.UNBAN_USER,
        entityName: 'User',
        entityId: user.id,
        oldValue: {
          isBanned: true,
          bannedAt: oldBannedAt,
          banReason: oldBanReason,
          banExpiresAt: oldBanExpiresAt,
        },
        newValue: {
          isBanned: false,
          bannedAt: null,
          banReason: null,
          banExpiresAt: null,
          auto: true,
          reason: 'BAN_EXPIRED_AUTO_UNBAN',
        },
        ipAddress: null,
      });

      em.persist(auditLog);
      await em.flush();
      return;
    }

    throw new ForbiddenException({
      code: 'ACCOUNT_BANNED',
      message: 'Your account has been banned.',
      ban: {
        reason: user.banReason ?? null,
        bannedAt: user.bannedAt ? user.bannedAt.toISOString() : null,
        banExpiresAt: user.banExpiresAt ? user.banExpiresAt.toISOString() : null,
        isPermanent: !user.banExpiresAt,
      },
    });
  }
}

/**
 * Transforms a stored imgUrl into the internal proxy avatar URL.
 * Only transforms R2 URLs or URLs without origin. Leaves other URLs (like Google OAuth) intact.
 */
export function getProxyAvatarUrl(
  imgUrl: string | null | undefined,
  userId: string,
  updatedAt: Date
): string | null {
  if (!imgUrl) return null;
  if (imgUrl.startsWith('/api/')) return imgUrl;

  const r2Base = process.env.R2_PUBLIC_DEV_URL || 'https://pub-4a3e334f734f4b669489b78b2a739715.r2.dev';
  
  if (imgUrl.startsWith(r2Base) || imgUrl.startsWith('avatars/')) {
    const version = updatedAt.getTime();
    return `/api/account/avatar/${userId}?v=${version}`;
  }

  // Not an R2 URL (e.g., Google profile picture), return as-is
  return imgUrl;
}
