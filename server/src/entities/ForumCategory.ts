import { Entity, type Opt, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ schema: 'web' })
export class ForumCategory {

  @PrimaryKey({ type: 'text', defaultRaw: `(gen_random_uuid())::text` })
  id!: string & Opt;

  @Property({ type: 'text', unique: 'ForumCategory_name_key' })
  name!: string;

  @Property({ fieldName: 'name_vi', type: 'text', unique: 'ForumCategory_name_vi_key' })
  nameVi!: string;

  @Property({ type: 'text', unique: 'ForumCategory_slug_key' })
  slug!: string;

  @Property({ fieldName: 'slug_vi', type: 'text', unique: 'ForumCategory_slug_vi_key' })
  slugVi!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ fieldName: 'description_vi', type: 'text', nullable: true })
  descriptionVi?: string;

  @Property({ type: 'text', nullable: true })
  iconUrl?: string;

  @Property({ type: 'boolean' })
  isOfficial: boolean & Opt = false;

}
