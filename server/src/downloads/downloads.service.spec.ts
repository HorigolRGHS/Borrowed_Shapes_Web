import { Test, TestingModule } from '@nestjs/testing';
import { DownloadsService } from './downloads.service';
import { FileAssetRepository } from './repositories/file-asset.repository';
import { DownloadLogRepository } from './repositories/download-log.repository';
import { DownloadStatsRepository } from './repositories/download-stats.repository';
import { AuditService } from '../audit/audit.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { ConfigService } from '@nestjs/config';
import { AuditActionType } from '../entities/AuditActionType';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('DownloadsService - confirmUpload', () => {
  let service: DownloadsService;
  let auditService: jest.Mocked<AuditService>;
  let fileAssetRepository: any;
  let r2Service: any;

  beforeEach(async () => {
    fileAssetRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((asset) => ({ ...asset, id: 'db-gen-id' })),
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
    };

    r2Service = {
      objectExists: jest.fn().mockResolvedValue(true),
      getObjectMetadata: jest.fn().mockResolvedValue({ contentLength: 1024 }),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };

    const mockAuditService = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadsService,
        { provide: FileAssetRepository, useValue: fileAssetRepository },
        { provide: DownloadLogRepository, useValue: {} },
        { provide: DownloadStatsRepository, useValue: {} },
        { provide: AuditService, useValue: mockAuditService },
        { provide: R2StorageService, useValue: r2Service },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<DownloadsService>(DownloadsService);
    auditService = module.get(AuditService);
  });

  it('should confirm upload, flush db, then audit', async () => {
    const dto = {
      fileVersion: '1.0.0',
      fileName: 'test.zip',
      filePath: 'game/windows/1.0.0/test.zip',
      fileSize: 1024,
      mimeType: 'application/zip',
    };

    const result = await service.confirmUpload('admin1', dto);

    expect(result.id).toBe('db-gen-id');
    expect(fileAssetRepository.persistAndFlush).toHaveBeenCalled();
    expect(auditService.recordStandalone).toHaveBeenCalledTimes(1);

    const flushOrder =
      fileAssetRepository.persistAndFlush.mock.invocationCallOrder[0];
    const auditOrder =
      auditService.recordStandalone.mock.invocationCallOrder[0];
    expect(flushOrder).toBeLessThan(auditOrder);

    expect(auditService.recordStandalone).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.CREATE,
        userId: 'admin1',
        entityName: 'FileAsset',
        entityId: 'db-gen-id',
        newValue: expect.objectContaining({
          operation: 'CONFIRM_UPLOAD',
          version: '1.0.0',
          fileName: 'test.zip',
        }),
      }),
    );
  });

  it('should not audit if file does not exist on storage', async () => {
    r2Service.objectExists.mockResolvedValueOnce(false);

    await expect(
      service.confirmUpload('admin1', {
        fileVersion: '1.0.0',
        fileName: 'test.zip',
        filePath: 'game/windows/1.0.0/test.zip',
        fileSize: 1024,
        mimeType: 'application/zip',
      }),
    ).rejects.toThrow(NotFoundException);

    expect(fileAssetRepository.persistAndFlush).not.toHaveBeenCalled();
    expect(auditService.recordStandalone).not.toHaveBeenCalled();
  });

  it('should not audit if version exists', async () => {
    fileAssetRepository.findOne.mockResolvedValueOnce({ id: 'existing' });

    await expect(
      service.confirmUpload('admin1', {
        fileVersion: '1.0.0',
        fileName: 'test.zip',
        filePath: 'game/windows/1.0.0/test.zip',
        fileSize: 1024,
        mimeType: 'application/zip',
      }),
    ).rejects.toThrow(ConflictException);

    expect(fileAssetRepository.persistAndFlush).not.toHaveBeenCalled();
    expect(auditService.recordStandalone).not.toHaveBeenCalled();
  });

  it('should propagate audit error but not rollback business flush', async () => {
    auditService.recordStandalone.mockRejectedValueOnce(
      new Error('Audit DB Down'),
    );

    await expect(
      service.confirmUpload('admin1', {
        fileVersion: '1.0.0',
        fileName: 'test.zip',
        filePath: 'game/windows/1.0.0/test.zip',
        fileSize: 1024,
        mimeType: 'application/zip',
      }),
    ).rejects.toThrow('Audit DB Down');

    // flush was called
    expect(fileAssetRepository.persistAndFlush).toHaveBeenCalled();
  });
});
