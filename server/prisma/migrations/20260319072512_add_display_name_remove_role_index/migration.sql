/*
  Warnings:

  - A unique constraint covering the columns `[displayName]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT;

-- CreateIndex
CREATE INDEX "ForumCommentVote_commentId_idx" ON "ForumCommentVote"("commentId");

-- CreateIndex
CREATE INDEX "ForumThreadVote_threadId_idx" ON "ForumThreadVote"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX "User_displayName_key" ON "User"("displayName");

-- CreateIndex
CREATE INDEX "WikiRevision_pageId_createdAt_idx" ON "WikiRevision"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "WikiRevision_authorId_idx" ON "WikiRevision"("authorId");
