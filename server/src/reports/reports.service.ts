import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Report } from '../entities/Report';
import { ReportMedia } from '../entities/ReportMedia';
import { ReportResponse } from '../entities/ReportResponse';
import { User } from '../entities/User';
import { ForumThread } from '../entities/ForumThread';
import { ForumComment } from '../entities/ForumComment';
import { GameProfile } from '../entities/GameProfile';
import { ReportStatus } from '../entities/ReportStatus';
import { ReportType } from '../entities/ReportType';
import { MediaType } from '../entities/MediaType';
import { ReportAction } from '../entities/ReportAction';
import { R2StorageService } from '../storage/r2-storage.service';
import { EmailService } from '../email/email.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { RejectReportDto } from './dto/reject-report.dto';
import { UploadReportMediaDto } from './dto/upload-report-media.dto';
import { getProxyAvatarUrl } from '../auth/auth-utils';
import { getProxyMediaUrl } from '../storage/media-utils';
import { ReportRepository } from './repositories/reports.repository';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../entities/AuditActionType';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly reportRepository: ReportRepository,
    private readonly storageService: R2StorageService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateReportDto, reporterId: string) {
    const reporter = this.reportRepository
      .getEntityManager()
      .getReference(User, reporterId);

    let reportedUser: User | null = null;
    if (dto.reportedUserId) {
      if (String(dto.reportedUserId) === String(reporterId)) {
        throw new BadRequestException('reports.cannot_report_self');
      }
      reportedUser = await this.reportRepository
        .getEntityManager()
        .findOne(User, { id: dto.reportedUserId });
      if (!reportedUser) throw new NotFoundException('reports.user_not_found');
    }

    let thread: ForumThread | null = null;
    if (dto.threadId) {
      thread = await this.reportRepository
        .getEntityManager()
        .findOne(ForumThread, { id: dto.threadId });
      if (!thread) throw new NotFoundException('reports.thread_not_found');
    }

    let comment: ForumComment | null = null;
    if (dto.commentId) {
      comment = await this.reportRepository
        .getEntityManager()
        .findOne(ForumComment, { id: dto.commentId });
      if (!comment) throw new NotFoundException('reports.comment_not_found');
    }

    const report = this.reportRepository.create({
      reporterId: reporter,
      reportedUserId: reportedUser || undefined,
      threadId: thread || undefined,
      commentId: comment || undefined,
      reportType: dto.reportType as any,
      reason: dto.reason,
      status: ReportStatus.PENDING as any,
    });

    const mediaEntities: ReportMedia[] = [];
    if (dto.media && dto.media.length > 0) {
      for (const item of dto.media) {
        const reportMedia = this.reportRepository
          .getEntityManager()
          .create(ReportMedia, {
            reportId: report,
            mediaUrl: item.mediaUrl,
            mediaType: item.mediaType as any,
            fileSize: item.fileSize ? BigInt(item.fileSize) : undefined,
          });
        mediaEntities.push(reportMedia);
      }
    }

    await this.reportRepository
      .getEntityManager()
      .persistAndFlush([report, ...mediaEntities]);

    // AUDIT LOGGING (After flush, report.id is now available)
    await this.auditService.recordStandalone({
      actionType: AuditActionType.PROCESS_REPORT,
      userId: reporterId,
      entityName: 'Report',
      entityId: report.id,
      newValue: {
        operation: 'CREATE',
        reportType: dto.reportType,
        reason: dto.reason,
        reportedUserId: dto.reportedUserId,
        threadId: dto.threadId,
        commentId: dto.commentId,
      },
    });

    return {
      id: report.id,
      reportType: report.reportType,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
    };
  }

  async uploadReportMedia(dto: UploadReportMediaDto, userId: string) {
    const maxLimit = 20 * 1024 * 1024;
    if (dto.fileSize > maxLimit) {
      throw new BadRequestException('reports.file_too_large');
    }

    const extByMime: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogg',
      'video/quicktime': 'mov',
    };
    const ext = extByMime[dto.mimeType] || 'png';
    const fileUUID = randomUUID();

    let folder = 'reports/users';
    if (dto.targetType === 'thread') {
      folder = 'reports/threads';
    } else if (dto.targetType === 'comment') {
      folder = 'reports/comments';
    }

    const key = `${folder}/${dto.targetId}/${fileUUID}.${ext}`;

    const uploadUrl = await this.storageService.createUploadUrl({
      key,
      contentType: dto.mimeType,
    });

    const publicUrlBase = this.configService
      .getOrThrow<string>('R2_PUBLIC_DEV_URL')
      .replace(/\/+$/, '');

    return {
      uploadUrl,
      method: 'PUT',
      key,
      publicUrl: getProxyMediaUrl(key) as string,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }

  async findMyReports(reporterId: string) {
    const list = await this.reportRepository.findMyReports(reporterId);

    return list.map((report) => ({
      id: report.id,
      reportType: report.reportType,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
      reportedUser: report.reportedUserId
        ? {
            id: report.reportedUserId.id,
            displayName: report.reportedUserId.displayName,
          }
        : null,
      thread: report.threadId
        ? {
            id: report.threadId.id,
            title: report.threadId.title,
            slug: report.threadId.slug,
          }
        : null,
      comment: report.commentId
        ? {
            id: report.commentId.id,
            content: report.commentId.content,
          }
        : null,
    }));
  }

  async getAdminStats() {
    return this.reportRepository.getAdminStats();
  }

  async findAdminReports(
    status?: ReportStatus,
    sort: 'asc' | 'desc' = 'desc',
    page = 1,
    limit = 20,
  ) {
    const [list, count] = await this.reportRepository.findAdminReports(
      status,
      sort,
      page,
      limit,
    );

    return {
      items: list.map((report) => ({
        id: report.id,
        reportType: report.reportType,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt,
        reporter: {
          id: report.reporterId.id,
          displayName: report.reporterId.displayName,
        },
        reportedUser: report.reportedUserId
          ? {
              id: report.reportedUserId.id,
              displayName: report.reportedUserId.displayName,
            }
          : null,
        thread: report.threadId
          ? {
              id: report.threadId.id,
              title: report.threadId.title,
              slug: report.threadId.slug,
            }
          : null,
        comment: report.commentId
          ? {
              id: report.commentId.id,
              content: report.commentId.content,
            }
          : null,
      })),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async findOne(id: string, userId: string, isAdmin: boolean) {
    const report = await this.reportRepository.findOneReportWithRelations(id);
    if (!report) throw new NotFoundException('reports.report_not_found');

    if (!isAdmin && String(report.reporterId.id) !== String(userId)) {
      throw new ForbiddenException('reports.forbidden_view');
    }

    const mediaList = await this.reportRepository
      .getEntityManager()
      .find(ReportMedia, { reportId: report });
    const response = await this.reportRepository
      .getEntityManager()
      .findOne(ReportResponse, { reportId: report }, { populate: ['adminId'] });

    return {
      id: report.id,
      reportType: report.reportType,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
      handledAt: report.handledAt,
      reporter: {
        id: report.reporterId.id,
        displayName: report.reporterId.displayName,
        imgUrl: getProxyAvatarUrl(report.reporterId.imgUrl, report.reporterId.id, report.reporterId.updatedAt),
      },
      reportedUser: report.reportedUserId
        ? {
            id: report.reportedUserId.id,
            displayName: report.reportedUserId.displayName,
            imgUrl: getProxyAvatarUrl(report.reportedUserId.imgUrl, report.reportedUserId.id, report.reportedUserId.updatedAt),
          }
        : null,
      thread: report.threadId
        ? {
            id: report.threadId.id,
            title: report.threadId.title,
            slug: report.threadId.slug,
          }
        : null,
      comment: report.commentId
        ? {
            id: report.commentId.id,
            content: report.commentId.content,
            threadId: report.commentId.threadId?.id || null,
            threadSlug: report.commentId.threadId?.slug || null,
          }
        : null,
      media: mediaList.map((m) => ({
        id: m.id,
        mediaUrl: getProxyMediaUrl(m.mediaUrl),
        mediaType: m.mediaType,
        fileSize: m.fileSize ? Number(m.fileSize) : null,
      })),
      response:
        response && (isAdmin || response.isVisibleToReporter)
          ? {
              id: response.id,
              message: response.message,
              actionTaken: response.actionTaken,
              isVisibleToReporter: response.isVisibleToReporter,
              createdAt: response.createdAt,
              admin: {
                id: response.adminId.id,
                displayName: response.adminId.displayName,
              },
            }
          : null,
    };
  }

  async resolve(id: string, adminId: string, dto: ResolveReportDto) {
    const report = await this.reportRepository.findOne(
      { id },
      { populate: ['reportedUserId', 'reporterId'] },
    );
    if (!report) throw new NotFoundException('reports.report_not_found');
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('reports.already_processed');
    }

    if (
      dto.actionTaken === ReportAction.WARNING ||
      dto.actionTaken === ReportAction.BAN_PERMANENT ||
      dto.actionTaken === ReportAction.BAN_CUSTOM
    ) {
      if (report.reportedUserId) {
        const reportedUser = await this.reportRepository
          .getEntityManager()
          .findOne(User, { id: report.reportedUserId.id });
        if (reportedUser && reportedUser.role === 'ADMIN') {
          throw new BadRequestException('reports.cannot_ban_admin');
        }
      }
    }

    const admin = this.reportRepository
      .getEntityManager()
      .getReference(User, adminId);

    report.status = ReportStatus.RESOLVED as any;
    report.handledBy = admin;
    report.handledAt = new Date();

    const response = this.reportRepository
      .getEntityManager()
      .create(ReportResponse, {
        reportId: report,
        adminId: admin,
        message: dto.message,
        actionTaken: dto.actionTaken as any,
        isVisibleToReporter: dto.isVisibleToReporter !== false,
      });

    if (
      dto.actionTaken === ReportAction.BAN_PERMANENT ||
      dto.actionTaken === ReportAction.BAN_CUSTOM
    ) {
      if (!report.reportedUserId) {
        throw new BadRequestException('reports.no_reported_user');
      }

      const user = await this.reportRepository
        .getEntityManager()
        .findOne(User, { id: report.reportedUserId.id });
      if (user) {
        user.isBanned = true;
        user.bannedAt = new Date();
        user.banReason = dto.message;
        user.banExpiresAt =
          dto.actionTaken === ReportAction.BAN_CUSTOM && dto.banExpiresAt
            ? new Date(dto.banExpiresAt)
            : undefined;

        this.reportRepository.getEntityManager().persist(user);
      }
    }

    // AUDIT LOGGING (Before flush)
    await this.auditService.recordInCurrentUnitOfWork({
      actionType: AuditActionType.PROCESS_REPORT,
      userId: adminId,
      entityName: 'Report',
      entityId: report.id,
      newValue: {
        operation: 'RESOLVE',
        resolutionAction: dto.actionTaken,
        reportId: report.id,
        targetUserId: report.reportedUserId?.id,
      },
    });

    if (
      dto.actionTaken === ReportAction.WARNING ||
      dto.actionTaken === ReportAction.BAN_PERMANENT ||
      dto.actionTaken === ReportAction.BAN_CUSTOM
    ) {
      const isBan =
        dto.actionTaken === ReportAction.BAN_PERMANENT ||
        dto.actionTaken === ReportAction.BAN_CUSTOM;

      if (report.reportedUserId) {
        await this.auditService.recordInCurrentUnitOfWork({
          actionType: isBan ? AuditActionType.BAN_USER : AuditActionType.UPDATE,
          userId: adminId,
          entityName: 'User',
          entityId: report.reportedUserId.id,
          newValue: {
            operation: isBan ? 'BAN_FROM_REPORT' : 'WARNING',
            reportId: report.id,
            banExpiresAt:
              isBan && dto.actionTaken === ReportAction.BAN_CUSTOM
                ? dto.banExpiresAt
                : undefined,
          },
        });
      }
    }

    await this.reportRepository
      .getEntityManager()
      .persistAndFlush([report, response]);

    if (report.reporterId?.email) {
      const reporter = report.reporterId;
      try {
        await this.emailService.sendReportResolvedEmail({
          to: String(reporter.email),
          displayName: reporter.displayName,
          status: 'RESOLVED',
          actionTaken: dto.actionTaken,
          adminMessage: dto.isVisibleToReporter !== false ? dto.message : null,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send resolution email to reporter ${reporter.id}`,
        );
      }
    }

    if (report.reportedUserId) {
      const reportedUser = await this.reportRepository
        .getEntityManager()
        .findOne(User, { id: report.reportedUserId.id });
      if (reportedUser && reportedUser.email) {
        if (
          dto.actionTaken === ReportAction.BAN_PERMANENT ||
          dto.actionTaken === ReportAction.BAN_CUSTOM
        ) {
          const banExpiresAtStr =
            dto.actionTaken === ReportAction.BAN_CUSTOM && dto.banExpiresAt
              ? new Date(dto.banExpiresAt)
              : null;
          await this.emailService.sendAccountBannedEmail({
            to: String(reportedUser.email),
            displayName: reportedUser.displayName,
            reason: dto.message,
            banExpiresAt: banExpiresAtStr,
          });
        } else if (dto.actionTaken === ReportAction.WARNING) {
          try {
            await this.emailService.sendReportWarningEmail({
              to: String(reportedUser.email),
              displayName: reportedUser.displayName,
              reason: dto.message,
            });
          } catch (error) {
            this.logger.warn(
              `Failed to send warning email to user ${reportedUser.id}`,
            );
          }
        }
      }
    }

    return { success: true };
  }

  async reject(id: string, adminId: string, dto: RejectReportDto) {
    const report = await this.reportRepository.findOne(
      { id },
      { populate: ['reporterId'] },
    );
    if (!report) throw new NotFoundException('reports.report_not_found');
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('reports.already_processed');
    }

    const admin = this.reportRepository
      .getEntityManager()
      .getReference(User, adminId);

    report.status = ReportStatus.REJECTED as any;
    report.handledBy = admin;
    report.handledAt = new Date();

    const response = this.reportRepository
      .getEntityManager()
      .create(ReportResponse, {
        reportId: report,
        adminId: admin,
        message: dto.message,
        actionTaken: ReportAction.NO_ACTION as any,
        isVisibleToReporter: dto.isVisibleToReporter !== false,
      });

    // AUDIT LOGGING (Before flush)
    await this.auditService.recordInCurrentUnitOfWork({
      actionType: AuditActionType.PROCESS_REPORT,
      userId: adminId,
      entityName: 'Report',
      entityId: report.id,
      newValue: {
        operation: 'REJECT',
        reportId: report.id,
        targetUserId: report.reportedUserId?.id,
      },
    });

    await this.reportRepository
      .getEntityManager()
      .persistAndFlush([report, response]);

    if (report.reporterId?.email) {
      const reporter = report.reporterId;
      try {
        await this.emailService.sendReportRejectedEmail({
          to: String(reporter.email),
          displayName: reporter.displayName,
          adminMessage: dto.isVisibleToReporter !== false ? dto.message : null,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send rejection email to reporter ${reporter.id}`,
        );
      }
    }

    return { success: true };
  }
}
