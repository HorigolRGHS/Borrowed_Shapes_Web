import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { ReportRepository } from './repositories/reports.repository';
import { R2StorageService } from '../storage/r2-storage.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { ReportAction } from '../entities/ReportAction';
import { AuditActionType } from '../entities/AuditActionType';
import { ReportStatus } from '../entities/ReportStatus';

const mockIp = '192.168.1.100';

describe('ReportsService Audit Logging', () => {
  let service: ReportsService;
  let auditService: jest.Mocked<AuditService>;
  let reportRepository: any;

  beforeEach(async () => {
    // Basic mocks to pass dependencies
    const mockAuditService = {
      recordInCurrentUnitOfWork: jest.fn().mockResolvedValue(undefined),
      recordStandalone: jest.fn().mockResolvedValue(undefined),
    };

    const mockEntityManager = {
      create: jest.fn().mockReturnValue({}),
      persist: jest.fn(),
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      getReference: jest.fn().mockReturnValue({ id: 'admin1' }),
      findOne: jest.fn().mockResolvedValue({
        id: 'user2',
        role: 'USER',
        email: 'test@example.com',
      }),
    };

    reportRepository = {
      getEntityManager: jest.fn().mockReturnValue(mockEntityManager),
      findOne: jest.fn().mockResolvedValue({
        id: 'report1',
        status: ReportStatus.PENDING,
        reporterId: { id: 'user1', email: 'user1@ex.com' },
        reportedUserId: { id: 'user2' },
      }),
      create: jest.fn().mockReturnValue({}),
    };

    const mockEmailService = {
      sendReportResolvedEmail: jest.fn().mockResolvedValue(undefined),
      sendReportRejectedEmail: jest.fn().mockResolvedValue(undefined),
      sendAccountBannedEmail: jest.fn().mockResolvedValue(undefined),
      sendReportWarningEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: ReportRepository, useValue: reportRepository },
        { provide: R2StorageService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: EmailService, useValue: mockEmailService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    auditService = module.get(AuditService);
  });

  it('reject should call a single PROCESS_REPORT log', async () => {
    await service.reject(
      'report1',
      'admin1',
      {
        message: 'reject msg',
        isVisibleToReporter: true,
      },
      mockIp,
    );

    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenCalledTimes(1);
    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenCalledWith({
      actionType: AuditActionType.PROCESS_REPORT,
      userId: 'admin1',
      entityName: 'Report',
      entityId: 'report1',
      newValue: {
        operation: 'REJECT',
        reportId: 'report1',
        targetUserId: 'user2',
      },
      ipAddress: mockIp,
    });

    // Ensure audit called before flush
    const flushMock = reportRepository.getEntityManager().persistAndFlush;
    expect(flushMock).toHaveBeenCalled();
    const auditCallOrder =
      auditService.recordInCurrentUnitOfWork.mock.invocationCallOrder[0];
    const flushCallOrder = flushMock.mock.invocationCallOrder[0];
    expect(auditCallOrder).toBeLessThan(flushCallOrder);
  });

  it('normal resolve should call a single PROCESS_REPORT log', async () => {
    await service.resolve(
      'report1',
      'admin1',
      {
        actionTaken: ReportAction.NO_ACTION,
        message: 'msg',
      },
      mockIp,
    );

    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenCalledTimes(1);
    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: AuditActionType.PROCESS_REPORT,
        userId: 'admin1',
        entityName: 'Report',
        entityId: 'report1',
        newValue: expect.objectContaining({
          operation: 'RESOLVE',
          resolutionAction: ReportAction.NO_ACTION,
        }),
        ipAddress: mockIp,
      }),
    );
  });

  it('resolve with warning should call two logs in order', async () => {
    await service.resolve(
      'report1',
      'admin1',
      {
        actionTaken: ReportAction.WARNING,
        message: 'warn',
      },
      mockIp,
    );

    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenCalledTimes(2);

    // First call: PROCESS_REPORT
    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        actionType: AuditActionType.PROCESS_REPORT,
        entityName: 'Report',
        newValue: expect.objectContaining({
          resolutionAction: ReportAction.WARNING,
        }),
        ipAddress: mockIp,
      }),
    );

    // Second call: UPDATE user
    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        actionType: AuditActionType.UPDATE,
        entityName: 'User',
        entityId: 'user2',
        newValue: expect.objectContaining({ operation: 'WARNING' }),
        ipAddress: mockIp,
      }),
    );

    const flushMock = reportRepository.getEntityManager().persistAndFlush;
    const secondAuditOrder =
      auditService.recordInCurrentUnitOfWork.mock.invocationCallOrder[1];
    const flushOrder = flushMock.mock.invocationCallOrder[0];
    expect(secondAuditOrder).toBeLessThan(flushOrder);
  });

  it('resolve with ban should call two logs in order', async () => {
    await service.resolve(
      'report1',
      'admin1',
      {
        actionTaken: ReportAction.BAN_PERMANENT,
        message: 'ban',
      },
      mockIp,
    );

    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenCalledTimes(2);

    // First call: PROCESS_REPORT
    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        actionType: AuditActionType.PROCESS_REPORT,
        entityName: 'Report',
        ipAddress: mockIp,
      }),
    );

    // Second call: BAN_USER
    expect(auditService.recordInCurrentUnitOfWork).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        actionType: AuditActionType.BAN_USER,
        entityName: 'User',
        entityId: 'user2',
        newValue: expect.objectContaining({ operation: 'BAN_FROM_REPORT' }),
        ipAddress: mockIp,
      }),
    );
  });

  it('should propagate audit error and prevent flush', async () => {
    auditService.recordInCurrentUnitOfWork.mockRejectedValueOnce(
      new Error('Audit DB Down'),
    );

    await expect(
      service.resolve(
        'report1',
        'admin1',
        {
          actionTaken: ReportAction.NO_ACTION,
          message: 'msg',
        },
        mockIp,
      ),
    ).rejects.toThrow('Audit DB Down');

    expect(
      reportRepository.getEntityManager().persistAndFlush,
    ).not.toHaveBeenCalled();
  });

  it('create should call recordStandalone with ipAddress', async () => {
    const reportMock = { id: 'report_created_1' };
    reportRepository.create.mockReturnValueOnce(reportMock);

    await service.create(
      {
        reportType: 'SPAM',
        reason: 'spamming posts',
        reportedUserId: 'user2',
      },
      'user1',
      mockIp,
    );

    expect(auditService.recordStandalone).toHaveBeenCalledTimes(1);
    expect(auditService.recordStandalone).toHaveBeenCalledWith({
      actionType: AuditActionType.PROCESS_REPORT,
      userId: 'user1',
      entityName: 'Report',
      entityId: 'report_created_1',
      newValue: {
        operation: 'CREATE',
        reportType: 'SPAM',
        reason: 'spamming posts',
        reportedUserId: 'user2',
        threadId: undefined,
        commentId: undefined,
      },
      ipAddress: mockIp,
    });
  });
});
