import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { ForumComment } from '../entities/ForumComment';

@Injectable()
export class ForumCommentRepository extends EntityRepository<ForumComment> {
  constructor(em: EntityManager) {
    super(em, ForumComment);
  }

  async findCommentsForThread(threadId: string, parentId: string | null, page: number, limit: number, userId?: string) {
    const offset = (page - 1) * limit;
    const parentCheck = parentId ? `c."parentId" = ?` : `c."parentId" IS NULL`;
    const params: any[] = parentId ? [threadId, parentId, limit, offset] : [threadId, limit, offset];

    const query = `
      SELECT 
        c."id", c."content", c."parentId", c."score", c."isDeleted",
        c."createdAt", c."updatedAt",
        u."id" AS "authorId", u."displayName" AS "authorName",
        u."imgUrl" AS "authorImg", u."role" AS "authorRole", u."createdAt" AS "authorCreatedAt",
        ach."badgeImageUrl",
        p."content" AS "parentContent",
        (SELECT COUNT(*)::int FROM web."ForumComment" r WHERE r."parentId" = c."id") AS "repliesCount"
        ${userId ? `, (SELECT v."value" FROM web."ForumCommentVote" v WHERE v."commentId" = c."id" AND v."userId" = ?) AS "userVote"` : ', NULL AS "userVote"'}
      FROM web."ForumComment" c
      LEFT JOIN auth."User" u ON u."id" = c."authorId"
      LEFT JOIN game."GameProfile" gp ON gp."userId" = u."id"
      LEFT JOIN game."Achievement" ach ON ach."id" = gp."equippedAchievementId"
      LEFT JOIN web."ForumComment" p ON p."id" = c."parentId"
      WHERE c."threadId" = ? AND ${parentCheck}
      ORDER BY c."createdAt" ASC
      LIMIT ? OFFSET ?
    `;

    const fullParams = userId ? [userId, ...params] : params;
    const rows = await this.em.execute(query, fullParams);

    return rows.map((row: any) => ({
      id: row.id,
      content: row.isDeleted ? "[Deleted]" : row.content,
      score: Number(row.score || 0),
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      parentId: row.parentId || null,
      parentContent: row.parentContent || null,
      author: row.isDeleted ? null : {
        id: row.authorId,
        displayName: row.authorName || "Deleted User",
        imgUrl: row.authorImg,
        badgeImageUrl: row.badgeImageUrl,
        role: row.authorRole,
        createdAt: row.authorCreatedAt,
      },
      repliesCount: Number(row.repliesCount || 0),
      hasReplies: Number(row.repliesCount || 0) > 0,
      userVote: row.userVote ? Number(row.userVote) : null,
    }));
  }
}
