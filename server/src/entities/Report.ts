import {
  Entity,
  Enum,
  Index,
  ManyToOne,
  type Opt,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { ForumComment } from './ForumComment';
import { ForumThread } from './ForumThread';
import { User } from './User';
import { Web$46ReportStatus } from './Web$46ReportStatus';
import { Web$46ReportType } from './Web$46ReportType';

@Entity({ schema: 'web' })
@Index({
  name: 'Report_status_createdAt_idx',
  expression:
    'CREATE INDEX "Report_status_createdAt_idx" ON web."Report" USING btree (status, "createdAt" DESC)',
  properties: ['status', 'createdAt'],
})
export class Report {
  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Index({
    name: 'Report_reporterId_idx',
    expression:
      'CREATE INDEX "Report_reporterId_idx" ON web."Report" USING btree ("reporterId")',
  })
  @ManyToOne({
    entity: () => User,
    fieldName: 'reporterId',
    deleteRule: 'cascade',
  })
  reporterId!: User;

  @Index({
    name: 'Report_reportedUserId_idx',
    expression:
      'CREATE INDEX "Report_reportedUserId_idx" ON web."Report" USING btree ("reportedUserId")',
  })
  @ManyToOne({
    entity: () => User,
    fieldName: 'reportedUserId',
    deleteRule: 'cascade',
    nullable: true,
  })
  reportedUserId?: User;

  @Index({
    name: 'Report_threadId_idx',
    expression:
      'CREATE INDEX "Report_threadId_idx" ON web."Report" USING btree ("threadId")',
  })
  @ManyToOne({
    entity: () => ForumThread,
    fieldName: 'threadId',
    deleteRule: 'cascade',
    nullable: true,
  })
  threadId?: ForumThread;

  @Index({
    name: 'Report_commentId_idx',
    expression:
      'CREATE INDEX "Report_commentId_idx" ON web."Report" USING btree ("commentId")',
  })
  @ManyToOne({
    entity: () => ForumComment,
    fieldName: 'commentId',
    deleteRule: 'cascade',
    nullable: true,
  })
  commentId?: ForumComment;

  @Enum({ items: () => Web$46ReportType, nativeEnumName: 'web.ReportType' })
  reportType: Web$46ReportType & Opt = Web$46ReportType.OTHER;

  @Property({ type: 'text' })
  reason!: string;

  @Enum({ items: () => Web$46ReportStatus, nativeEnumName: 'web.ReportStatus' })
  status: Web$46ReportStatus & Opt = Web$46ReportStatus.PENDING;

  @ManyToOne({
    entity: () => User,
    fieldName: 'handledBy',
    deleteRule: 'set null',
    nullable: true,
  })
  handledBy?: User;

  @Property({ nullable: true })
  handledAt?: Date;

  @Index({
    name: 'Report_pending_idx',
    expression:
      'CREATE INDEX "Report_pending_idx" ON web."Report" USING btree ("createdAt" DESC) WHERE (status = \'PENDING\'::web."ReportStatus")',
  })
  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  updatedAt!: Date & Opt;
}
