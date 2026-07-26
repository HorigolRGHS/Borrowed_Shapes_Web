import { BaseRepository } from '../../common/repositories/base.repository';
import { getProxyAvatarUrl } from '../../auth/auth-utils';
import { getProxyMediaUrl } from '../../storage/media-utils';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { ForumComment } from '../../entities/ForumComment';
import { ForumCommentVote } from '../../entities/ForumCommentVote';

@Injectable()
export class ForumCommentRepository extends BaseRepository<ForumComment> {
  constructor(em: EntityManager) {
    super(em, ForumComment);
  }

  async findCommentsForThread(
    threadId: string,
    parentId: string | null,
    page: number,
    limit: number,
    userId?: string,
  ) {
    const offset = (page - 1) * limit;
    const parentCheck = parentId ? `c."parentId" = ?` : `c."parentId" IS NULL`;
    const params: any[] = parentId
      ? [threadId, parentId, limit, offset]
      : [threadId, limit, offset];

    const query = `
      SELECT 
        c."id", c."content", c."parentId", c."score", c."isDeleted",
        c."createdAt", c."updatedAt",
        u."id" AS "authorId", u."displayName" AS "authorName",
        u."imgUrl" AS "authorImg", u."role" AS "authorRole", u."createdAt" AS "authorCreatedAt", u."updatedAt" AS "authorUpdatedAt",
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
      content: row.isDeleted ? '[Deleted]' : row.content,
      score: Number(row.score || 0),
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      parentId: row.parentId || null,
      parentContent: row.parentContent || null,
      author: row.isDeleted
        ? null
        : {
            id: row.authorId,
            displayName: row.authorName || 'Deleted User',
            imgUrl: getProxyAvatarUrl(row.authorImg, row.authorId, row.authorUpdatedAt),
            badgeImageUrl: getProxyMediaUrl(row.badgeImageUrl),
            role: row.authorRole,
            createdAt: row.authorCreatedAt,
          },
      repliesCount: Number(row.repliesCount || 0),
      hasReplies: Number(row.repliesCount || 0) > 0,
      userVote: row.userVote ? Number(row.userVote) : null,
    }));
  }
}

@Injectable()
export class ForumCommentVoteRepository extends BaseRepository<ForumCommentVote> {
  constructor(em: EntityManager) {
    super(em, ForumCommentVote);
  }

  async getUserVote(userId: string, commentId: string): Promise<number | null> {
    const res = await this.em.execute(
      `select "value" from web."ForumCommentVote" where "userId" = ? and "commentId" = ?`,
      [userId, commentId],
    );
    return res[0]?.value ?? null;
  }

  async removeUserVote(userId: string, commentId: string): Promise<void> {
    await this.em.execute(
      `delete from web."ForumCommentVote" where "userId" = ? and "commentId" = ?`,
      [userId, commentId],
    );
  }

  async updateUserVote(
    userId: string,
    commentId: string,
    value: number | string,
  ): Promise<void> {
    await this.em.execute(
      `update web."ForumCommentVote" set "value" = ? where "userId" = ? and "commentId" = ?`,
      [value, userId, commentId],
    );
  }
}
