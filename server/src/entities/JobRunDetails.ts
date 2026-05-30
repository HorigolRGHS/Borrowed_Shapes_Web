import { Entity, PrimaryKey, PrimaryKeyProp, Property } from '@mikro-orm/core';

@Entity({ tableName: 'job_run_details', schema: 'cron' })
export class JobRunDetails {

  [PrimaryKeyProp]?: 'runid';

  @Property({ nullable: true })
  jobid?: bigint;

  @PrimaryKey()
  runid!: bigint;

  @Property({ fieldName: 'job_pid', nullable: true })
  jobPid?: number;

  @Property({ type: 'text', nullable: true })
  database?: string;

  @Property({ type: 'text', nullable: true })
  username?: string;

  @Property({ type: 'text', nullable: true })
  command?: string;

  @Property({ type: 'text', nullable: true })
  status?: string;

  @Property({ fieldName: 'return_message', type: 'text', nullable: true })
  returnMessage?: string;

  @Property({ fieldName: 'start_time', nullable: true })
  startTime?: Date;

  @Property({ fieldName: 'end_time', nullable: true })
  endTime?: Date;

}
