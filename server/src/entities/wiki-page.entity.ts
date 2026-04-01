import { Entity, PrimaryKey, Property, OneToMany, Collection, Index } from '@mikro-orm/core';
import { init } from '@paralleldrive/cuid2';
import type { WikiRevision } from './wiki-revision.entity';

const createId = init({ length: 24 });

@Index({ properties: ['title'] })
@Entity({ schema: 'web', tableName: 'WikiPage' })
export class WikiPage {
  @PrimaryKey()
  id: string = createId();

  @Property({ unique: true })
  slug!: string;

  @Property()
  title!: string;

  @Property({ nullable: true, type: 'json' })
  metadataJson?: unknown;

  @Property({ nullable: true })
  latestRevisionId?: string | null;

  @OneToMany('WikiRevision', 'page')
  revisions = new Collection<WikiRevision>(this);
}
