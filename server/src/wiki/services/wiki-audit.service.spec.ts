import { Test } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { WikiAuditService } from './wiki-audit.service';
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
      providers: [
        WikiAuditService,
        { provide: EntityManager, useValue: em },
      ],
    }).compile();
    service = moduleRef.get(WikiAuditService);
  });

  it('writes an audit log entry', async () => {
    await service.log({
      userId: 'user-1',
      actionType: AuditActionType.CREATE,
      entityName: 'WikiPage',
      entityId: 'page-1',
      newValue: { foo: 'bar' },
      ipAddress: '127.0.0.1',
    });

    expect(em.create).toHaveBeenCalledTimes(1);
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
});
