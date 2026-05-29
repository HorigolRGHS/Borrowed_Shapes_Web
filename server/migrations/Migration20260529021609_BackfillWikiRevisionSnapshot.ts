import { Migration } from '@mikro-orm/migrations';

export class Migration20260529021609_BackfillWikiRevisionSnapshot extends Migration {

  override async up(): Promise<void> {
    this.addSql(`
      UPDATE web."WikiRevision" r
      SET
        "title" = w."title",
        "title_vi" = w."title_vi",
        "slug" = w."slug",
        "slug_vi" = w."slug_vi",
        "metadataJson" = w."metadataJson",
        "isPublished" = w."isPublished"
      FROM web."WikiPage" w
      WHERE r."pageId" = w."id"
        AND r."title" IS NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      UPDATE web."WikiRevision"
      SET
        "title" = NULL,
        "title_vi" = NULL,
        "slug" = NULL,
        "slug_vi" = NULL,
        "metadataJson" = NULL,
        "isPublished" = NULL;
    `);
  }

}
