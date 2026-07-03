import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
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

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly storageService: R2StorageService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) { }

  async create(dto: CreateReportDto, reporterId: string) {
    const reporter = this.em.getReference(User, reporterId);

    let reportedUser: User | null = null;
    if (dto.reportedUserId) {
      if (String(dto.reportedUserId) === String(reporterId)) {
        throw new BadRequestException('reports.cannot_report_self');
      }
      reportedUser = await this.em.findOne(User, { id: dto.reportedUserId });
      if (!reportedUser) throw new NotFoundException('reports.user_not_found');
    }

    let thread: ForumThread | null = null;
    if (dto.threadId) {
      thread = await this.em.findOne(ForumThread, { id: dto.threadId });
      if (!thread) throw new NotFoundException('reports.thread_not_found');
    }

    let comment: ForumComment | null = null;
    if (dto.commentId) {
      comment = await this.em.findOne(ForumComment, { id: dto.commentId });
      if (!comment) throw new NotFoundException('reports.comment_not_found');
    }

    const report = this.em.create(Report, {
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
        const reportMedia = this.em.create(ReportMedia, {
          reportId: report,
          mediaUrl: item.mediaUrl,
          mediaType: item.mediaType as any,
          fileSize: item.fileSize ? BigInt(item.fileSize) : undefined,
        });
        mediaEntities.push(reportMedia);
      }
    }

    await this.em.persistAndFlush([report, ...mediaEntities]);

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
      publicUrl: `${publicUrlBase}/${key}`,
      headers: {
        'Content-Type': dto.mimeType,
      },
    };
  }

  async findMyReports(reporterId: string) {
    const list = await this.em.find(
      Report,
      { reporterId },
      {
        populate: ['reportedUserId', 'threadId', 'commentId', 'handledBy'],
        orderBy: { createdAt: 'DESC' },
      },
    );

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
    const total = await this.em.count(Report);
    const pending = await this.em.count(Report, { status: ReportStatus.PENDING as any });
    const resolved = await this.em.count(Report, { status: ReportStatus.RESOLVED as any });
    const rejected = await this.em.count(Report, { status: ReportStatus.REJECTED as any });

    return { total, pending, resolved, rejected };
  }

  async findAdminReports(
    status?: ReportStatus,
    sort: 'asc' | 'desc' = 'desc',
    page = 1,
    limit = 20,
  ) {
    const filterQuery: any = {};
    if (status) {
      filterQuery.status = status;
    }

    const [list, count] = await this.em.findAndCount(
      Report,
      filterQuery,
      {
        populate: ['reporterId', 'reportedUserId', 'threadId', 'commentId', 'handledBy'],
        orderBy: { createdAt: sort.toUpperCase() as any },
        limit,
        offset: (page - 1) * limit,
      },
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
    const report = await this.em.findOne(
      Report,
      { id },
      { populate: ['reporterId', 'reportedUserId', 'threadId', 'commentId', 'commentId.threadId', 'handledBy'] },
    );
    if (!report) throw new NotFoundException('Report not found');

    if (!isAdmin && String(report.reporterId.id) !== String(userId)) {
      throw new ForbiddenException('You do not have permission to view this report');
    }

    const mediaList = await this.em.find(ReportMedia, { reportId: report });
    const response = await this.em.findOne(
      ReportResponse,
      { reportId: report },
      { populate: ['adminId'] },
    );

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
        imgUrl: report.reporterId.imgUrl,
      },
      reportedUser: report.reportedUserId
        ? {
          id: report.reportedUserId.id,
          displayName: report.reportedUserId.displayName,
          imgUrl: report.reportedUserId.imgUrl,
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
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        fileSize: m.fileSize ? Number(m.fileSize) : null,
      })),
      response: response && (isAdmin || response.isVisibleToReporter)
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
    const report = await this.em.findOne(Report, { id }, { populate: ['reportedUserId', 'reporterId'] });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Report is already processed');
    }

    if (
      dto.actionTaken === ReportAction.WARNING ||
      dto.actionTaken === ReportAction.BAN_PERMANENT ||
      dto.actionTaken === ReportAction.BAN_CUSTOM
    ) {
      if (report.reportedUserId) {
        const reportedUser = await this.em.findOne(User, { id: report.reportedUserId.id });
        if (reportedUser && reportedUser.role === 'ADMIN') {
          throw new BadRequestException('reports.cannot_ban_admin');
        }
      }
    }

    const admin = this.em.getReference(User, adminId);

    report.status = ReportStatus.RESOLVED as any;
    report.handledBy = admin;
    report.handledAt = new Date();

    const response = this.em.create(ReportResponse, {
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
        throw new BadRequestException('No reported user associated with this report');
      }

      const user = await this.em.findOne(User, { id: report.reportedUserId.id });
      if (user) {
        user.isBanned = true;
        user.bannedAt = new Date();
        user.banReason = dto.message;
        user.banExpiresAt =
          dto.actionTaken === ReportAction.BAN_CUSTOM && dto.banExpiresAt
            ? new Date(dto.banExpiresAt)
            : undefined;

        this.em.persist(user);
      }
    }

    await this.em.persistAndFlush([report, response]);

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
        this.logger.warn(`Failed to send resolution email to reporter ${reporter.id}`);
      }
    }

    if (report.reportedUserId) {
      const reportedUser = await this.em.findOne(User, { id: report.reportedUserId.id });
      if (reportedUser && reportedUser.email) {
        if (dto.actionTaken === ReportAction.BAN_PERMANENT || dto.actionTaken === ReportAction.BAN_CUSTOM) {
          const banExpiresAtStr = dto.actionTaken === ReportAction.BAN_CUSTOM && dto.banExpiresAt
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
            this.logger.warn(`Failed to send warning email to user ${reportedUser.id}`);
          }
        }
      }
    }

    return { success: true };
  }

  async reject(id: string, adminId: string, dto: RejectReportDto) {
    const report = await this.em.findOne(Report, { id }, { populate: ['reporterId'] });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status !== ReportStatus.PENDING) {
      throw new BadRequestException('Report is already processed');
    }

    const admin = this.em.getReference(User, adminId);

    report.status = ReportStatus.REJECTED as any;
    report.handledBy = admin;
    report.handledAt = new Date();

    const response = this.em.create(ReportResponse, {
      reportId: report,
      adminId: admin,
      message: dto.message,
      actionTaken: ReportAction.NO_ACTION as any,
      isVisibleToReporter: dto.isVisibleToReporter !== false,
    });

    await this.em.persistAndFlush([report, response]);

    if (report.reporterId?.email) {
      const reporter = report.reporterId;
      try {
        await this.emailService.sendReportRejectedEmail({
          to: String(reporter.email),
          displayName: reporter.displayName,
          adminMessage: dto.isVisibleToReporter !== false ? dto.message : null,
        });
      } catch (error) {
        this.logger.warn(`Failed to send rejection email to reporter ${reporter.id}`);
      }
    }

    return { success: true };
  }
}
