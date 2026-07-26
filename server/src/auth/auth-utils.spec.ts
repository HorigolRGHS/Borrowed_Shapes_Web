import { ForbiddenException } from '@nestjs/common';
import { ensureAccountActive } from './auth-utils';
import { User } from '../entities/User';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../entities/AuditActionType';

describe('auth-utils ensureAccountActive', () => {
  let mockEm: any;
  let mockAuditService: any;
  let user: Partial<User>;

  beforeEach(() => {
    mockEm = {
      flush: jest.fn().mockResolvedValue(undefined),
    };

    mockAuditService = {
      recordInCurrentUnitOfWork: jest.fn().mockResolvedValue(undefined),
    };

    user = {
      id: 'user1',
      deletedAt: undefined,
      isBanned: false,
      bannedAt: undefined,
      banReason: undefined,
      banExpiresAt: undefined,
    };
  });

  it('should pass for active user without audit', async () => {
    await ensureAccountActive(user as User, mockEm, mockAuditService);
    expect(mockAuditService.recordInCurrentUnitOfWork).not.toHaveBeenCalled();
    expect(mockEm.flush).not.toHaveBeenCalled();
  });

  it('should throw and not audit if ban has not expired', async () => {
    user.isBanned = true;
    user.bannedAt = new Date('2020-01-01');
    user.banReason = 'Spam';
    user.banExpiresAt = new Date(Date.now() + 100000); // future

    await expect(
      ensureAccountActive(user as User, mockEm, mockAuditService),
    ).rejects.toThrow(ForbiddenException);

    expect(mockAuditService.recordInCurrentUnitOfWork).not.toHaveBeenCalled();
    expect(mockEm.flush).not.toHaveBeenCalled();
  });

  it('should auto-unban, audit, and flush if ban has expired', async () => {
    const oldBannedAt = new Date('2020-01-01');
    const oldBanExpiresAt = new Date(Date.now() - 100000); // past
    user.isBanned = true;
    user.bannedAt = oldBannedAt;
    user.banReason = 'Spam';
    user.banExpiresAt = oldBanExpiresAt;

    await ensureAccountActive(user as User, mockEm, mockAuditService);

    expect(user.isBanned).toBe(false);
    expect(user.bannedAt).toBeUndefined();

    expect(mockAuditService.recordInCurrentUnitOfWork).toHaveBeenCalledTimes(1);
    expect(mockAuditService.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.UNBAN_USER,
        userId: null,
        entityName: 'User',
        entityId: 'user1',
        oldValue: expect.objectContaining({
          isBanned: true,
        }),
        newValue: expect.objectContaining({
          operation: 'AUTO_UNBAN',
          isBanned: false,
        }),
      }),
    );

    const auditOrder =
      mockAuditService.recordInCurrentUnitOfWork.mock.invocationCallOrder[0];
    const flushOrder = mockEm.flush.mock.invocationCallOrder[0];
    expect(auditOrder).toBeLessThan(flushOrder);
  });

  it('should propagate audit error and not flush', async () => {
    mockAuditService.recordInCurrentUnitOfWork.mockRejectedValueOnce(
      new Error('Audit Down'),
    );

    user.isBanned = true;
    user.banExpiresAt = new Date(Date.now() - 100000); // past

    await expect(
      ensureAccountActive(user as User, mockEm, mockAuditService),
    ).rejects.toThrow('Audit Down');

    expect(mockEm.flush).not.toHaveBeenCalled();
  });
});
