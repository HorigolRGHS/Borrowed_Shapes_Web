import { Migration } from '@mikro-orm/migrations';

export class Migration20260529022100_TightenWikiRevisionSnapshot extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "web"."WikiRevision" alter column "title" type text using ("title"::text);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "title" set not null;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "title_vi" type text using ("title_vi"::text);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "title_vi" set not null;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "slug" type text using ("slug"::text);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "slug" set not null;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "slug_vi" type text using ("slug_vi"::text);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "slug_vi" set not null;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "isPublished" type boolean using ("isPublished"::boolean);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "isPublished" set default false;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "isPublished" set not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "web"."WikiRevision" alter column "title" type text using ("title"::text);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "title" drop not null;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "title_vi" type text using ("title_vi"::text);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "title_vi" drop not null;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "slug" type text using ("slug"::text);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "slug" drop not null;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "slug_vi" type text using ("slug_vi"::text);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "slug_vi" drop not null;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "isPublished" drop default;`);
    this.addSql(`alter table "web"."WikiRevision" alter column "isPublished" type boolean using ("isPublished"::boolean);`);
    this.addSql(`alter table "web"."WikiRevision" alter column "isPublished" drop not null;`);
  }

}
