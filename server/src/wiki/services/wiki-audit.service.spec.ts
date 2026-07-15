import { WikiAuditService } from './wiki-audit.service';
import { WikiAuditRepository } from '../repositories/wiki-audit.repository';
import { AuditActionType } from '../../entities/AuditActionType';

describe('WikiAuditService', () => {
  let service: WikiAuditService;
  let auditRepo: { insertForked: jest.Mock };

  beforeEach(() => {
    auditRepo = { insertForked: jest.fn().mockResolvedValue(undefined) };
    service = new WikiAuditService(auditRepo as unknown as WikiAuditRepository);
  });

  it('delegates to the repo with correct fields', async () => {
    await service.log({
      userId: 'user-1',
      actionType: AuditActionType.CREATE,
      entityName: 'WikiPage',
      entityId: 'page-1',
      newValue: { foo: 'bar' },
      ipAddress: '127.0.0.1',
    });

    expect(auditRepo.insertForked).toHaveBeenCalledTimes(1);
    expect(auditRepo.insertForked).toHaveBeenCalledWith(
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

  it('does not throw when the repo rejects', async () => {
    auditRepo.insertForked.mockRejectedValueOnce(new Error('db down'));
    const warnSpy = jest
      .spyOn((service as any).logger, 'warn')
      .mockImplementation(() => undefined);
    await expect(
      service.log({
        userId: 'user-1',
        actionType: AuditActionType.CREATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  describe('Boundary', () => {
    it('delegates when both oldValue and newValue are undefined', async () => {
      await service.log({
        userId: 'user-1',
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
      });
      expect(auditRepo.insertForked).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          actionType: AuditActionType.UPDATE,
          entityName: 'WikiPage',
          entityId: 'page-1',
        }),
      );
      expect(auditRepo.insertForked).toHaveBeenCalledTimes(1);
    });

    it('delegates when ipAddress is undefined', async () => {
      await service.log({
        userId: 'user-1',
        actionType: AuditActionType.CREATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
        newValue: { foo: 'bar' },
      });
      expect(auditRepo.insertForked).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'page-1',
          newValue: { foo: 'bar' },
        }),
      );
      expect(auditRepo.insertForked).toHaveBeenCalledTimes(1);
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
        service.log({
          userId: 'user-1',
          actionType: AuditActionType.UPDATE,
          entityName: 'WikiPage',
          entityId: 'page-1',
          newValue: big,
        }),
      ).resolves.toBeUndefined();
      expect(auditRepo.insertForked).toHaveBeenCalledTimes(1);
    });
  });

  describe('Abnormal', () => {
    it('catches and warns when the repo throws (does not re-throw)', async () => {
      auditRepo.insertForked.mockImplementationOnce(() => {
        throw new Error('boom');
      });
      const warnSpy = jest
        .spyOn((service as any).logger, 'warn')
        .mockImplementation(() => undefined);
      await expect(
        service.log({
          userId: 'user-1',
          actionType: AuditActionType.CREATE,
          entityName: 'WikiPage',
          entityId: 'page-1',
        }),
      ).resolves.toBeUndefined();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('does not throw when userId is empty string', async () => {
      await expect(
        service.log({
          userId: '',
          actionType: AuditActionType.CREATE,
          entityName: 'WikiPage',
          entityId: 'page-1',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
