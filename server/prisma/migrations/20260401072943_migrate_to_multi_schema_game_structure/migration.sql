/*
  Warnings:

  - You are about to drop the column `experiencePoints` on the `GameProfile` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `GameProfile` table. All the data in the column will be lost.
  - You are about to drop the column `virtualCurrency` on the `GameProfile` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `GameProfile` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionResult" AS ENUM ('WIN', 'LOSE', 'ABANDONED');

-- CreateEnum
CREATE TYPE "GameSessionStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- AlterTable
ALTER TABLE "GameProfile" DROP COLUMN "experiencePoints",
DROP COLUMN "level",
DROP COLUMN "virtualCurrency",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "totalAbandoned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPlayTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSessions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalWins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRun" (
    "id" TEXT NOT NULL,
    "totalLevels" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "totalTimeSec" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lobbyId" TEXT,

    CONSTRAINT "GameRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRunPlayer" (
    "runId" TEXT NOT NULL,
    "gameProfileId" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GameRunPlayer_pkey" PRIMARY KEY ("runId","gameProfileId")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "status" "GameSessionStatus" NOT NULL DEFAULT 'WAITING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "minPlayers" INTEGER NOT NULL DEFAULT 2,
    "maxPlayers" INTEGER NOT NULL DEFAULT 5,
    "result" "SessionResult",
    "completionTimeSec" INTEGER,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSessionPlayer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "gameProfileId" TEXT NOT NULL,
    "isAbsent" BOOLEAN NOT NULL DEFAULT false,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "GameSessionPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Level_order_key" ON "Level"("order");

-- CreateIndex
CREATE INDEX "GameRun_isCompleted_totalTimeSec_idx" ON "GameRun"("isCompleted", "totalTimeSec");

-- CreateIndex
CREATE INDEX "GameRun_lobbyId_idx" ON "GameRun"("lobbyId");

-- CreateIndex
CREATE INDEX "GameRunPlayer_gameProfileId_idx" ON "GameRunPlayer"("gameProfileId");

-- CreateIndex
CREATE INDEX "GameSession_runId_idx" ON "GameSession"("runId");

-- CreateIndex
CREATE INDEX "GameSession_levelId_idx" ON "GameSession"("levelId");

-- CreateIndex
CREATE INDEX "GameSession_status_idx" ON "GameSession"("status");

-- CreateIndex
CREATE INDEX "GameSessionPlayer_gameProfileId_idx" ON "GameSessionPlayer"("gameProfileId");

-- CreateIndex
CREATE INDEX "GameSessionPlayer_sessionId_idx" ON "GameSessionPlayer"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSessionPlayer_sessionId_gameProfileId_key" ON "GameSessionPlayer"("sessionId", "gameProfileId");

-- AddForeignKey
ALTER TABLE "GameRunPlayer" ADD CONSTRAINT "GameRunPlayer_runId_fkey" FOREIGN KEY ("runId") REFERENCES "GameRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRunPlayer" ADD CONSTRAINT "GameRunPlayer_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_runId_fkey" FOREIGN KEY ("runId") REFERENCES "GameRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionPlayer" ADD CONSTRAINT "GameSessionPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSessionPlayer" ADD CONSTRAINT "GameSessionPlayer_gameProfileId_fkey" FOREIGN KEY ("gameProfileId") REFERENCES "GameProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
