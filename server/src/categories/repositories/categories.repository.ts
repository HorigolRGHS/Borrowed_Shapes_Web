import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { ForumCategory } from '../../entities/ForumCategory';

@Injectable()
export class ForumCategoryRepository extends BaseRepository<ForumCategory> {
  constructor(em: EntityManager) {
    super(em, ForumCategory);
  }

  async findAllCategories(locale: 'en' | 'vi', order: 'asc' | 'desc' = 'asc') {
    const nameField = locale === 'vi' ? 'c."name_vi"' : 'c."name"';
    const slugField = locale === 'vi' ? 'c."slug_vi"' : 'c."slug"';
    const descField =
      locale === 'vi' ? 'c."description_vi"' : 'c."description"';
    const sortOrder = order === 'desc' ? 'desc' : 'asc';

    const rows = await this.em.execute(
      `
      select c."id", ${nameField} as "name", ${slugField} as "slug",
             ${descField} as "description", c."iconUrl",
             c."isOfficial",
             c."name" as "nameEn", c."name_vi" as "nameVi",
             c."slug" as "slugEn", c."slug_vi" as "slugVi",
             c."description" as "descriptionEn", c."description_vi" as "descriptionVi",
             COUNT(t."id") as "threadCount"
      from web."ForumCategory" c
      left join web."ForumThread" t on t."categoryId" = c."id"
      group by c."id"
      order by ${nameField} ${sortOrder}
      `,
      [],
    );

    return rows.map((row: any) => ({
      ...row,
      threadCount: Number(row.threadCount || 0),
    }));
  }

  async findAllUnofficialCategories(
    locale: 'en' | 'vi',
    order: 'asc' | 'desc' = 'asc',
  ) {
    const nameField = locale === 'vi' ? 'c."name_vi"' : 'c."name"';
    const slugField = locale === 'vi' ? 'c."slug_vi"' : 'c."slug"';
    const descField =
      locale === 'vi' ? 'c."description_vi"' : 'c."description"';
    const sortOrder = order === 'desc' ? 'desc' : 'asc';

    const rows = await this.em.execute(
      `
      select c."id", ${nameField} as "name", ${slugField} as "slug",
             ${descField} as "description", c."iconUrl",
             c."isOfficial",
             c."name" as "nameEn", c."name_vi" as "nameVi",
             c."slug" as "slugEn", c."slug_vi" as "slugVi",
             c."description" as "descriptionEn", c."description_vi" as "descriptionVi",
             COUNT(t."id") as "threadCount"
      from web."ForumCategory" c
      left join web."ForumThread" t on t."categoryId" = c."id"
      where c."isOfficial" = false
      group by c."id"
      order by ${nameField} ${sortOrder}
      `,
      [],
    );

    return rows.map((row: any) => ({
      ...row,
      threadCount: Number(row.threadCount || 0),
    }));
  }

  async findOneCategory(id: string, locale: 'en' | 'vi') {
    const nameField = locale === 'vi' ? 'c."name_vi"' : 'c."name"';
    const slugField = locale === 'vi' ? 'c."slug_vi"' : 'c."slug"';
    const descField =
      locale === 'vi' ? 'c."description_vi"' : 'c."description"';

    const rows = await this.em.execute(
      `
      select c."id", ${nameField} as "name", ${slugField} as "slug",
             ${descField} as "description", c."iconUrl",
             c."isOfficial",
             c."name" as "nameEn", c."name_vi" as "nameVi",
             c."slug" as "slugEn", c."slug_vi" as "slugVi",
             c."description" as "descriptionEn", c."description_vi" as "descriptionVi",
             COUNT(t."id") as "threadCount"
      from web."ForumCategory" c
      left join web."ForumThread" t on t."categoryId" = c."id"
      where c."id" = ?
      group by c."id"
      `,
      [id],
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      ...row,
      threadCount: Number(row.threadCount || 0),
    };
  }
}
