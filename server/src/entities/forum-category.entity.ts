import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { ForumThread } from './forum-thread.entity';

const createId = init({ length: 24 });

@Entity({ schema: 'web', tableName: 'ForumCategory' })
export class ForumCategory {
  @PrimaryKey()
  id: string = createId();

  @Property({ unique: true })
  name!: string;

  @Property({ unique: true })
  slug!: string;

  @Property({ nullable: true })
  description?: string | null;

  @Property({ nullable: true })
  iconUrl?: string | null;

  @Property({ default: false })
  isOfficial: boolean = false;

  @Property({ default: 0 })
  displayOrder: number = 0;

  @OneToMany('ForumThread', 'category')
  threads = new Collection<ForumThread>(this);
}
