import { Test } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { WikiAuditService } from './wiki.service';
import { AuditActionType } from '../../entities/AuditActionType';

describe('WikiAuditService', () => {
  let service: WikiAuditService;
  let em: {
    create: jest.Mock;
    flush: jest.Mock;
    getReference: jest.Mock;
    fork: jest.Mock;
  };

  beforeEach(async () => {
    em = {
      create: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      getReference: jest.fn().mockReturnValue({ id: 'user-1' }),
      fork: jest.fn(),
    };
    em.fork.mockReturnValue(em);
    const moduleRef = await Test.createTestingModule({
      providers: [WikiAuditService, { provide: EntityManager, useValue: em }],
    }).compile();
    service = moduleRef.get(WikiAuditService);
  });

  it('writes an audit log entry with correct fields', async () => {
    await service.log({
      userId: 'user-1',
      actionType: AuditActionType.CREATE,
      entityName: 'WikiPage',
      entityId: 'page-1',
      newValue: { foo: 'bar' },
      ipAddress: '127.0.0.1',
    });

    expect(em.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionType: AuditActionType.CREATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
        newValue: { foo: 'bar' },
        ipAddress: '127.0.0.1',
      }),
    );
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('does not throw when flush fails', async () => {
    em.flush.mockRejectedValueOnce(new Error('db down'));
    await expect(
      service.log({
        userId: 'user-1',
        actionType: AuditActionType.CREATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
      }),
    ).resolves.toBeUndefined();
  });

  describe('Boundary', () => {
    it('flushes when both oldValue and newValue are undefined', async () => {
      await service.log({
        userId: 'user-1',
        actionType: AuditActionType.UPDATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
      });
      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          oldValue: undefined,
          newValue: undefined,
        }),
      );
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('flushes when ipAddress is undefined', async () => {
      await service.log({
        userId: 'user-1',
        actionType: AuditActionType.CREATE,
        entityName: 'WikiPage',
        entityId: 'page-1',
        newValue: { foo: 'bar' },
      });
      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ipAddress: undefined }),
      );
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('flushes a large nested newValue payload (>10KB JSON) without throwing', async () => {
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
      expect(em.flush).toHaveBeenCalledTimes(1);
    });
  });

  describe('Abnormal', () => {
    it('catches and warns when getReference throws (does not re-throw)', async () => {
      em.getReference.mockImplementationOnce(() => {
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

    it('does not throw when em.create throws inside the try block', async () => {
      em.create.mockImplementationOnce(() => {
        throw new Error('create failed');
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
