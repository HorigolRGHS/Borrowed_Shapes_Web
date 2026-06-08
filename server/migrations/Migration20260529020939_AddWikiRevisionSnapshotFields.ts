import { Migration } from '@mikro-orm/migrations';

export class Migration20260529020939_AddWikiRevisionSnapshotFields extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table web."WikiRevision" add column "title" text null;`);
    this.addSql(`alter table web."WikiRevision" add column "title_vi" text null;`);
    this.addSql(`alter table web."WikiRevision" add column "slug" text null;`);
    this.addSql(`alter table web."WikiRevision" add column "slug_vi" text null;`);
    this.addSql(`alter table web."WikiRevision" add column "metadataJson" jsonb null;`);
    this.addSql(`alter table web."WikiRevision" add column "isPublished" boolean null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table web."WikiRevision" drop column "isPublished";`);
    this.addSql(`alter table web."WikiRevision" drop column "metadataJson";`);
    this.addSql(`alter table web."WikiRevision" drop column "slug_vi";`);
    this.addSql(`alter table web."WikiRevision" drop column "slug";`);
    this.addSql(`alter table web."WikiRevision" drop column "title_vi";`);
    this.addSql(`alter table web."WikiRevision" drop column "title";`);
  }

}
