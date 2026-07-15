import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Report } from '../../entities/Report';
import { ReportStatus } from '../../entities/ReportStatus';

@Injectable()
export class ReportRepository extends BaseRepository<Report> {
  constructor(em: EntityManager) {
    super(em, Report);
  }

  async findMyReports(reporterId: string) {
    return this.find(
      { reporterId },
      {
        populate: ['reportedUserId', 'threadId', 'commentId', 'handledBy'],
        orderBy: { createdAt: 'DESC' },
      },
    );
  }

  async getAdminStats() {
    const total = await this.count();
    const pending = await this.count({ status: ReportStatus.PENDING as any });
    const resolved = await this.count({ status: ReportStatus.RESOLVED as any });
    const rejected = await this.count({ status: ReportStatus.REJECTED as any });

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

    return this.findAndCount(filterQuery, {
      populate: [
        'reporterId',
        'reportedUserId',
        'threadId',
        'commentId',
        'handledBy',
      ],
      orderBy: { createdAt: sort.toUpperCase() as any },
      limit,
      offset: (page - 1) * limit,
    });
  }

  async findOneReportWithRelations(id: string) {
    return this.findOne(
      { id },
      {
        populate: [
          'reporterId',
          'reportedUserId',
          'threadId',
          'commentId',
          'commentId.threadId',
          'handledBy',
        ],
      },
    );
  }
}
