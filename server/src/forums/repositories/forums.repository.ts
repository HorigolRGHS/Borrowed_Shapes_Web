import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { ForumThread } from '../../entities/ForumThread';
import { Locale } from '../../common/utils/resolve-locale';

@Injectable()
export class ForumThreadRepository extends BaseRepository<ForumThread> {
  constructor(em: EntityManager) {
    super(em, ForumThread);
  }

  async listThreads(
    {
      page = 1,
      limit = 20,
      q = '',
      categoryId,
      sortBy = 'createdAt',
      order = 'desc',
      month,
      year,
      postType,
      status,
    }: any,
    user?: { userId?: string; role?: string },
    locale: Locale = 'en',
  ) {
    const offset = (page - 1) * limit;
    const clauses: string[] = [];
    const params: any[] = [];

    if (q && q.trim()) {
      clauses.push(`(title ilike ? or content ilike ?)`);
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm);
    }

    if (categoryId) {
      clauses.push(`"categoryId" = ?`);
      params.push(categoryId);
    }

    if (postType) {
      clauses.push(`t."postType" = ?`);
      params.push(postType);
    }

    if (status) {
      clauses.push(`t."status" = ?`);
      params.push(status);
    }

    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      clauses.push(`t."createdAt" >= ? and t."createdAt" < ?`);
      params.push(startDate, endDate);
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      clauses.push(`t."createdAt" >= ? and t."createdAt" < ?`);
      params.push(startDate, endDate);
    }

    if (!(user && user.role === 'ADMIN')) {
      if (user?.userId) {
        clauses.push(`(t."status" <> 'ARCHIVED' OR t."authorId" = ?)`);
        params.push(user.userId);
      } else {
        clauses.push(`t."status" <> 'ARCHIVED'`);
      }
    }

    const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
    const categoryNameField = locale === 'vi' ? 'c."name_vi"' : 'c."name"';
    const categorySlugField = locale === 'vi' ? 'c."slug_vi"' : 'c."slug"';
    const validSortFields = ['score', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const orderClause = `order by t."isPinned" desc, t."${sortField}" ${sortOrder}`;

    const rows = await this.em.execute(
      `
      select t."id", t."slug", t."title", t."content", t."score", 
             t."viewCount", t."isPinned", t."postType", t."status",
             t."createdAt", t."updatedAt", t."imageUrl",
             u."id" as "authorId", u."displayName" as "authorName", u."imgUrl" as "authorAvatar",
             u."role" as "authorRole", u."createdAt" as "authorCreatedAt",
             a."badgeImageUrl" as "authorBadgeImageUrl",
             a."type" as "authorBadgeType",
             a."seasonMonth" as "authorBadgeSeasonMonth",
             a."expiresAt" as "authorBadgeExpiresAt",
             c."id" as "categoryId", ${categoryNameField} as "categoryName", ${categorySlugField} as "categorySlug"
      from web."ForumThread" t
      inner join auth."User" u on u."id" = t."authorId"
      left join game."GameProfile" gp on gp."userId" = u."id"
      left join game."Achievement" a on a."id" = gp."equippedAchievementId"
      inner join web."ForumCategory" c on c."id" = t."categoryId"
      ${where}
      ${orderClause}
      limit ? offset ?
      `,
      [...params, limit, offset],
    );

    const countRes = await this.em.execute(
      `select count(1) as cnt from web."ForumThread" t ${where}`,
      params,
    );

    const total = Number(countRes?.[0]?.cnt || 0);

    return {
      rows,
      total,
    };
  }
}
