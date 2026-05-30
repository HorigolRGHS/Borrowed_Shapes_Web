import { Entity, Enum, ManyToOne, OneToOne, type Opt, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { Report } from './Report';
import { User } from './User';
import { Web$46ReportAction } from './Web$46ReportAction';

@Entity({ schema: 'web' })
export class ReportResponse {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Unique({ name: 'ReportResponse_reportId_key', expression: 'CREATE UNIQUE INDEX "ReportResponse_reportId_key" ON web."ReportResponse" USING btree ("reportId")' })
  @OneToOne({ entity: () => Report, fieldName: 'reportId', deleteRule: 'cascade' })
  reportId!: Report;

  @ManyToOne({ entity: () => User, fieldName: 'adminId', deleteRule: 'set null' })
  adminId!: User;

  @Property({ type: 'text' })
  message!: string;

  @Enum({ items: () => Web$46ReportAction, nativeEnumName: 'web.ReportAction', nullable: true })
  actionTaken?: Web$46ReportAction;

  @Property({ type: 'boolean' })
  isVisibleToReporter: boolean & Opt = true;

  @Property({ type: 'datetime', defaultRaw: `now()` })
  createdAt!: Date & Opt;

}
