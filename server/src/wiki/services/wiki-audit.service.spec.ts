import { WikiAuditService } from './wiki-audit.service';
import { AuditService } from '../../audit/audit.service';
import { AuditActionType } from '../../entities/AuditActionType';

describe('WikiAuditService', () => {
  let service: WikiAuditService;
  let auditService: { recordStandalone: jest.Mock };

  beforeEach(() => {
    auditService = { recordStandalone: jest.fn().mockResolvedValue(undefined) };
    service = new WikiAuditService(auditService as unknown as AuditService);
  });

  it('delegates to the repo with correct fields', async () => {
    await service.recordStandalone({
      userId: 'user-1',
      actionType: AuditActionType.CREATE,
      entityName: 'WikiPage',
      entityId: 'page-1',
      newValue: { foo: 'bar' },
      ipAddress: '127.0.0.1',
    });

    expect(auditService.recordStandalone).toHaveBeenCalledTimes(1);
    expect(auditService.recordStandalone).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        actionType: AuditActionType.CREATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
        newValue: { foo: 'bar' },
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('throws when the repo rejects', async () => {
    auditService.recordStandalone.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.recordStandalone({
        userId: 'user-1',
        actionType: AuditActionType.CREATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
      }),
    ).rejects.toThrow('db down');
  });

  describe('Boundary', () => {
    it('delegates when both oldValue and newValue are undefined', async () => {
      await service.recordStandalone({
        userId: 'user-1',
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
      });
      expect(auditService.recordStandalone).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          actionType: AuditActionType.UPDATE,
          entityName: 'WikiPage',
          entityId: 'page-1',
        }),
      );
      expect(auditService.recordStandalone).toHaveBeenCalledTimes(1);
    });

    it('delegates when ipAddress is undefined', async () => {
      await service.recordStandalone({
        userId: 'user-1',
        actionType: AuditActionType.CREATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
        newValue: { foo: 'bar' },
      });
      expect(auditService.recordStandalone).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'page-1',
          newValue: { foo: 'bar' },
        }),
      );
      expect(auditService.recordStandalone).toHaveBeenCalledTimes(1);
    });

    it('delegates a large nested newValue payload (>10KB JSON) without throwing', async () => {
      const big = {
        content: 'x'.repeat(15_000),
        nested: {
          items: Array.from({ length: 200 }, (_, i) => ({
            idx: i,
            label: 'lbl' + i,
          })),
        },
      };
      await expect(
        service.recordStandalone({
          userId: 'user-1',
          actionType: AuditActionType.UPDATE,
          entityName: 'WikiPage',
          entityId: 'page-1',
          newValue: big,
        }),
      ).resolves.toBeUndefined();
      expect(auditService.recordStandalone).toHaveBeenCalledTimes(1);
    });
  });

  describe('Abnormal', () => {
    it('throws when the repo throws', async () => {
      auditService.recordStandalone.mockImplementationOnce(() => {
        throw new Error('boom');
      });
      await expect(
        service.recordStandalone({
          userId: 'user-1',
          actionType: AuditActionType.CREATE,
          entityName: 'WikiPage',
          entityId: 'page-1',
        }),
      ).rejects.toThrow('boom');
    });

    it('does not throw when userId is empty string', async () => {
      await expect(
        service.recordStandalone({
          userId: '',
          actionType: AuditActionType.CREATE,
          entityName: 'WikiPage',
          entityId: 'page-1',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
