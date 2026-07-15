import {
  Entity,
  type Opt,
  PrimaryKey,
  PrimaryKeyProp,
  Property,
  Unique,
} from '@mikro-orm/core';

@Entity({ tableName: 'job', schema: 'cron' })
@Unique({ name: 'jobname_username_uniq', properties: ['jobname', 'username'] })
export class Job {
  [PrimaryKeyProp]?: 'jobid';

  @PrimaryKey()
  jobid!: bigint;

  @Property({ type: 'text' })
  schedule!: string;

  @Property({ type: 'text' })
  command!: string;

  @Property({ type: 'text' })
  nodename: string & Opt = 'localhost';

  @Property({ type: 'integer', defaultRaw: `inet_server_port()` })
  nodeport: number & Opt = NaN;

  @Property({ type: 'text', defaultRaw: `current_database()` })
  database!: string & Opt;

  @Property({ type: 'text', defaultRaw: `CURRENT_USER` })
  username!: string & Opt;

  @Property({ type: 'boolean' })
  active: boolean & Opt = true;

  @Property({ type: 'text', nullable: true })
  jobname?: string;
}
