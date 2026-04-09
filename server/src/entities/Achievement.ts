import { Entity, type Opt, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ schema: 'game' })
export class Achievement {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ type: 'text', unique: 'Achievement_name_key' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text' })
  criteriaCode!: string;

  @Property({ type: 'text' })
  badgeImageUrl!: string;

}
