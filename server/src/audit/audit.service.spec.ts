import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { AuditSanitizer } from './audit.sanitizer';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuditActionType } from '../entities/AuditActionType';

describe('AuditService', () => {
  let service: AuditService;
  let repository: jest.Mocked<AuditLogRepository>;
  let sanitizer: jest.Mocked<AuditSanitizer>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: AuditLogRepository,
          useValue: {
            createAndFlush: jest.fn(),
            persistInCurrentUoW: jest.fn(),
            persistInTransaction: jest.fn(),
          },
        },
        {
          provide: AuditSanitizer,
          useValue: {
            sanitize: jest.fn((val) => val), // passthrough mock
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get(AuditLogRepository);
    sanitizer = module.get(AuditSanitizer);
  });

  it('recordStandalone should call createAndFlush', async () => {
    const params = {
      actionType: AuditActionType.LOGIN,
      entityName: 'User',
      entityId: '1',
    };
    await service.recordStandalone(params);
    expect(repository.createAndFlush).toHaveBeenCalledWith(params);
  });

  it('recordInCurrentUnitOfWork should call persistInCurrentUoW', async () => {
    const params = {
      actionType: AuditActionType.LOGIN,
      entityName: 'User',
      entityId: '1',
    };
    await service.recordInCurrentUnitOfWork(params);
    expect(repository.persistInCurrentUoW).toHaveBeenCalledWith(params);
  });

  it('recordInTransaction should call persistInTransaction', () => {
    const params = {
      actionType: AuditActionType.LOGIN,
      entityName: 'User',
      entityId: '1',
    };
    const mockEm = {} as EntityManager;
    service.recordInTransaction(mockEm, params);
    expect(repository.persistInTransaction).toHaveBeenCalledWith(
      mockEm,
      params,
    );
  });

  it('should call sanitizer if newValue or oldValue is provided', async () => {
    const params = {
      actionType: AuditActionType.UPDATE,
      entityName: 'User',
      entityId: '1',
      oldValue: { name: 'old' },
      newValue: { name: 'new' },
    };
    await service.recordStandalone(params);
    expect(sanitizer.sanitize).toHaveBeenCalledWith(params.oldValue);
    expect(sanitizer.sanitize).toHaveBeenCalledWith(params.newValue);
  });
});
