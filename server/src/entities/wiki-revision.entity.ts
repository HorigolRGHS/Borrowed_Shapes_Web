import { Entity, PrimaryKey, Property, ManyToOne, Index, Opt } from '@mikro-orm/core';
import type { Ref } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { WikiPage } from './wiki-page.entity';
import type { User } from './user.entity';

const createId = init({ length: 24 });

@Index({ properties: ['page', 'createdAt'] })
@Index({ properties: ['author'] })
@Entity({ schema: 'web', tableName: 'WikiRevision' })
export class WikiRevision {
  @PrimaryKey()
  id: string & Opt = createId();

  @Property({ columnType: 'text' })
  content!: string;

  @Property()
  createdAt: Date & Opt = new Date();

  @ManyToOne('WikiPage', { ref: true })
  page!: Ref<WikiPage>;

  @ManyToOne('User', { ref: true })
  author!: Ref<User>;
}
