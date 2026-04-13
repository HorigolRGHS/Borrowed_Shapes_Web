-- ═══════════════════════════════════════════════════════════════
--  Database Schema - Game Unity + Web Wiki/Forum
--  Version: 2.2
-- ═══════════════════════════════════════════════════════════════

SET TIMEZONE = 'Asia/Ho_Chi_Minh';

CREATE SCHEMA IF NOT EXISTS public;
-- Extension cho case-insensitive text (email, displayName)
CREATE EXTENSION IF NOT EXISTS citext SCHEMA public;

-- ═══════════════════════════════════════════════════════════════
--  SCHEMA: auth
-- ═══════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS auth;

-- ─── Enums ───────────────────────────────────────────────
CREATE TYPE auth."Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE auth."SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'LOGGED_OUT');
CREATE TYPE auth."AuditActionType" AS ENUM (
  'CREATE', 'UPDATE', 'DELETE',
  'LOGIN', 'LOGOUT', 'REVOKE_SESSION',
  'BAN_USER', 'UNBAN_USER', 'PROCESS_REPORT'
);

-- ─── User ────────────────────────────────────────────────
CREATE TABLE auth."User" (
  "id"           TEXT          NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email"        CITEXT        NOT NULL UNIQUE,
  "passwordHash" TEXT,
  "googleId"     TEXT          UNIQUE,                       
  "imgUrl"       TEXT,
  "displayName"  CITEXT        UNIQUE,                       
  "role"         auth."Role"   NOT NULL DEFAULT 'USER',
  "isBanned"     BOOLEAN       NOT NULL DEFAULT FALSE,
  "bannedAt"     TIMESTAMPTZ,
  "banReason"    TEXT,
  "banExpiresAt" TIMESTAMPTZ,
  "deletedAt"    TIMESTAMPTZ,                                
  "createdAt"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Nếu có passwordHash thì email phải tồn tại (luôn đúng vì NOT NULL)
  -- Nếu không có passwordHash thì phải có googleId
  CONSTRAINT "User_auth_method_check"
    CHECK ("passwordHash" IS NOT NULL OR "googleId" IS NOT NULL)
);

CREATE INDEX "User_banExpiresAt_idx"
  ON auth."User"("banExpiresAt")
  WHERE "isBanned" = TRUE;

CREATE INDEX "User_deletedAt_idx"
  ON auth."User"("deletedAt")
  WHERE "deletedAt" IS NULL;

-- ─── UserSession ─────────────────────────────────────────
CREATE TABLE auth."UserSession" (
  "id"         TEXT                 NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT                 NOT NULL,
  "sessionId"  TEXT                 NOT NULL UNIQUE,
  "platform"   TEXT,
  "loginTime"  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "logoutTime" TIMESTAMPTZ,
  "deviceInfo" TEXT,
  "ipAddress"  INET                 NOT NULL,                
  "status"     auth."SessionStatus" NOT NULL DEFAULT 'ACTIVE',

  CONSTRAINT "UserSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth."User"("id") ON DELETE CASCADE
);

CREATE INDEX "UserSession_userId_idx"      ON auth."UserSession"("userId");
CREATE INDEX "UserSession_loginTime_idx"   ON auth."UserSession"("loginTime");
CREATE INDEX "UserSession_status_idx"      ON auth."UserSession"("status")
  WHERE "status" = 'ACTIVE';

-- ─── AuditLog ────────────────────────────────────────────
CREATE TABLE auth."AuditLog" (
  "id"         TEXT                   NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     TEXT,
  "actionType" auth."AuditActionType" NOT NULL,
  "entityName" TEXT                   NOT NULL,
  "entityId"   TEXT                   NOT NULL,
  "oldValue"   JSONB,
  "newValue"   JSONB,
  "timestamp"  TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  "ipAddress"  INET,                                         

  CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth."User"("id") ON DELETE SET NULL
);

CREATE INDEX "AuditLog_userId_idx"     ON auth."AuditLog"("userId");
CREATE INDEX "AuditLog_entityName_idx" ON auth."AuditLog"("entityName");
CREATE INDEX "AuditLog_entityId_idx"   ON auth."AuditLog"("entityId");
CREATE INDEX "AuditLog_timestamp_idx"  ON auth."AuditLog"("timestamp" DESC);



CREATE TABLE auth."UserOnlineStatus" (
  "userId"          TEXT        NOT NULL PRIMARY KEY,
  "isOnline"        BOOLEAN     NOT NULL DEFAULT FALSE,
  "lastOnline"      TIMESTAMPTZ,
  "onlinePlatforms" JSONB,
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "UserOnlineStatus_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth."User"("id") ON DELETE CASCADE
);

CREATE INDEX "UserOnlineStatus_lastOnline_idx"
  ON auth."UserOnlineStatus"("lastOnline");

CREATE INDEX "UserOnlineStatus_isOnline_idx"
  ON auth."UserOnlineStatus"("isOnline")
  WHERE "isOnline" = TRUE;



-- ═══════════════════════════════════════════════════════════════
--  SCHEMA: game
-- ═══════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS game;

-- ─── Enums ───────────────────────────────────────────────
CREATE TYPE game."SessionResult"     AS ENUM ('WIN', 'LOSE', 'ABANDONED');
CREATE TYPE game."GameSessionStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- ─── Level ───────────────────────────────────────────────
CREATE TABLE game."Level" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "order"       INT  NOT NULL UNIQUE
);

INSERT INTO game."Level" ("id", "displayName", "order") VALUES
  ('lobby',  'Lobby',       0),
  ('map_01', 'Kitchen',     1),
  ('map_02', 'Bedroom',     2),
  ('map_03', 'Bathroom',    3),
  ('map_04', 'Basement',    4),
  ('map_05', 'Living Room', 5)
ON CONFLICT ("id") DO NOTHING;

-- ─── GameProfile ─────────────────────────────────────────
CREATE TABLE game."GameProfile" (
  "id"             TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"         TEXT        NOT NULL UNIQUE,
  "totalPlayTime"  INT         NOT NULL DEFAULT 0,
  "totalSessions"  INT         NOT NULL DEFAULT 0,
  "totalWins"      INT         NOT NULL DEFAULT 0,
  "totalLosses"    INT         NOT NULL DEFAULT 0,
  "totalAbandoned" INT         NOT NULL DEFAULT 0,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "GameProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth."User"("id") ON DELETE CASCADE
);

-- ─── Achievement ─────────────────────────────────────────
CREATE TABLE game."Achievement" (
  "id"             TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"           TEXT NOT NULL UNIQUE,
  "description"    TEXT,
  "criteriaCode"   TEXT NOT NULL,
  "badgeImageUrl"  TEXT NOT NULL
);

-- ─── UserAchievement ─────────────────────────────────────
CREATE TABLE game."UserAchievement" (
  "gameProfileId" TEXT        NOT NULL,
  "achievementId" TEXT        NOT NULL,
  "achievedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY ("gameProfileId", "achievementId"),
  CONSTRAINT "UserAchievement_gameProfileId_fkey"
    FOREIGN KEY ("gameProfileId") REFERENCES game."GameProfile"("id") ON DELETE CASCADE,
  CONSTRAINT "UserAchievement_achievementId_fkey"
    FOREIGN KEY ("achievementId") REFERENCES game."Achievement"("id") ON DELETE CASCADE
);

-- ─── GameRun ─────────────────────────────────────────────
-- Một lần chơi xuyên suốt từ map đầu đến map cuối của một nhóm cố định.
-- Leaderboard: chỉ tính isCompleted=TRUE, sort theo totalTimeSec ASC.
CREATE TABLE game."GameRun" (
  "id"           TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "lobbyId"      TEXT,                                       -- Unity Lobby Service ID
  "lobbyCode"    TEXT,                                       -- Code join: ABC123
  "lobbyName"    TEXT,
  "isPrivate"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "totalLevels"  INT         NOT NULL,
  "isCompleted"  BOOLEAN     NOT NULL DEFAULT FALSE,
  -- totalTimeSec là DERIVED từ SUM(GameSession.completionTimeSec).
  -- Update bằng trigger khi GameSession chuyển sang FINISHED.
  "totalTimeSec" INT,
  "startedAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completedAt"  TIMESTAMPTZ,

  CONSTRAINT "GameRun_completed_check"
    CHECK (
      ("isCompleted" = FALSE AND "completedAt" IS NULL)
      OR
      ("isCompleted" = TRUE AND "completedAt" IS NOT NULL AND "totalTimeSec" IS NOT NULL)
    )
);

-- partial index tối ưu cho leaderboard
CREATE INDEX "GameRun_leaderboard_idx"
  ON game."GameRun"("totalTimeSec" ASC)
  WHERE "isCompleted" = TRUE;

CREATE INDEX "GameRun_lobbyId_idx"   ON game."GameRun"("lobbyId");
CREATE INDEX "GameRun_isPrivate_idx" ON game."GameRun"("isPrivate") WHERE "isPrivate" = FALSE;
CREATE INDEX "GameRun_lobbyCode_idx" ON game."GameRun"("lobbyCode") WHERE "lobbyCode" IS NOT NULL;

-- ─── GameRunPlayer ───────────────────────────────────────
CREATE TABLE game."GameRunPlayer" (
  "runId"         TEXT        NOT NULL,
  "gameProfileId" TEXT        NOT NULL,
  "isHost"        BOOLEAN     NOT NULL DEFAULT FALSE,
  "joinedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("runId", "gameProfileId"),
  CONSTRAINT "GameRunPlayer_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES game."GameRun"("id") ON DELETE CASCADE,
  CONSTRAINT "GameRunPlayer_gameProfileId_fkey"
    FOREIGN KEY ("gameProfileId") REFERENCES game."GameProfile"("id") ON DELETE CASCADE
);

CREATE INDEX "GameRunPlayer_gameProfileId_idx"
  ON game."GameRunPlayer"("gameProfileId");

-- Một run chỉ có duy nhất 1 host
/*
 * CREATE UNIQUE INDEX "GameRunPlayer_one_host_per_run_idx"
  ON game."GameRunPlayer"("runId")
  WHERE "isHost" = TRUE;
 * */


-- ─── GameSession ─────────────────────────────────────────
-- Mỗi GameRun có tối đa N GameSession (1 per map).
CREATE TABLE game."GameSession" (
  "id"                TEXT                     NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "runId"             TEXT                     NOT NULL,
  "levelId"           TEXT                     NOT NULL,
  "status"            game."GameSessionStatus" NOT NULL DEFAULT 'WAITING',
  "minPlayers"        INT                      NOT NULL DEFAULT 2,
  "maxPlayers"        INT                      NOT NULL DEFAULT 5,
  "startedAt"         TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  "endedAt"           TIMESTAMPTZ,
  "result"            game."SessionResult",
  "completionTimeSec" INT,

  CONSTRAINT "GameSession_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES game."GameRun"("id") ON DELETE CASCADE,
  CONSTRAINT "GameSession_levelId_fkey"
    FOREIGN KEY ("levelId") REFERENCES game."Level"("id"),

  CONSTRAINT "GameSession_player_count_check"
    CHECK ("minPlayers" >= 1 AND "maxPlayers" >= "minPlayers")
);

CREATE INDEX "GameSession_runId_idx"   ON game."GameSession"("runId");
CREATE INDEX "GameSession_levelId_idx" ON game."GameSession"("levelId");
CREATE INDEX "GameSession_status_idx"  ON game."GameSession"("status");

-- ─── GameSessionPlayer ───────────────────────────────────
CREATE TABLE game."GameSessionPlayer" (
  "sessionId"     TEXT        NOT NULL,
  "gameProfileId" TEXT        NOT NULL,
  "isAbsent"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "leftAt"        TIMESTAMPTZ,

  PRIMARY KEY ("sessionId", "gameProfileId"),
  CONSTRAINT "GameSessionPlayer_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES game."GameSession"("id") ON DELETE CASCADE,
  CONSTRAINT "GameSessionPlayer_gameProfileId_fkey"
    FOREIGN KEY ("gameProfileId") REFERENCES game."GameProfile"("id") ON DELETE CASCADE
);

CREATE INDEX "GameSessionPlayer_gameProfileId_idx" ON game."GameSessionPlayer"("gameProfileId");
CREATE INDEX "GameSessionPlayer_sessionId_idx"     ON game."GameSessionPlayer"("sessionId");

-- ═══════════════════════════════════════════════════════════════
--  SCHEMA: web
-- ═══════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS web;

-- ─── Enums ───────────────────────────────────────────────
CREATE TYPE web."ForumThreadStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');
CREATE TYPE web."ForumPostType"     AS ENUM (
  'GENERAL', 'BUG_REPORT', 'GUIDE', 'SUGGESTION', 'FAN_ART', 'LOOKING_FOR_PARTY'
);
CREATE TYPE web."AnnouncementType"  AS ENUM ('NEWS', 'EVENT', 'MAINTENANCE', 'UPDATE', 'PATCH_NOTE');
CREATE TYPE web."ReportStatus"      AS ENUM ('PENDING', 'PROCESSING', 'RESOLVED', 'REJECTED');
CREATE TYPE web."ReportType"        AS ENUM ('CHEATING', 'TOXIC_BEHAVIOR', 'EXPLOIT', 'OTHER');
CREATE TYPE web."MediaType"         AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE web."ReportAction"      AS ENUM ('WARNING', 'NO_ACTION', 'BAN_PERMANENT', 'BAN_CUSTOM');

-- ─── Report ──────────────────────────────────────────────
CREATE TABLE web."Report" (
  "id"             TEXT               NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reporterId"     TEXT               NOT NULL,
  "reportedUserId" TEXT               NOT NULL,
  "sessionId"      TEXT,
  "runId"          TEXT,
  "reportType"     web."ReportType"   NOT NULL DEFAULT 'OTHER',
  "reason"         TEXT               NOT NULL,
  "status"         web."ReportStatus" NOT NULL DEFAULT 'PENDING',
  "handledBy"      TEXT,
  "handledAt"      TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT "Report_no_self_report_check"
    CHECK ("reporterId" <> "reportedUserId"),

  CONSTRAINT "Report_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES auth."User"("id") ON DELETE CASCADE,
  CONSTRAINT "Report_reportedUserId_fkey"
    FOREIGN KEY ("reportedUserId") REFERENCES auth."User"("id") ON DELETE CASCADE,
  CONSTRAINT "Report_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES game."GameSession"("id") ON DELETE SET NULL,
  CONSTRAINT "Report_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES game."GameRun"("id") ON DELETE SET NULL,
  CONSTRAINT "Report_handledBy_fkey"
    FOREIGN KEY ("handledBy") REFERENCES auth."User"("id") ON DELETE SET NULL
);

CREATE INDEX "Report_status_createdAt_idx" ON web."Report"("status", "createdAt" DESC);
CREATE INDEX "Report_reporterId_idx"       ON web."Report"("reporterId");
CREATE INDEX "Report_reportedUserId_idx"   ON web."Report"("reportedUserId");
CREATE INDEX "Report_sessionId_idx"        ON web."Report"("sessionId");
CREATE INDEX "Report_pending_idx"          ON web."Report"("createdAt" DESC)
  WHERE "status" = 'PENDING';

-- ─── ReportMedia ─────────────────────────────────────────
CREATE TABLE web."ReportMedia" (
  "id"         TEXT            NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reportId"   TEXT            NOT NULL,
  "mediaUrl"   TEXT            NOT NULL,
  "mediaType"  web."MediaType" NOT NULL,
  "fileSize"   BIGINT,
  "duration"   INT,
  "uploadedAt" TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT "ReportMedia_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES web."Report"("id") ON DELETE CASCADE
);

CREATE INDEX "ReportMedia_reportId_idx" ON web."ReportMedia"("reportId");

-- ─── ReportResponse ──────────────────────────────────────
CREATE TABLE web."ReportResponse" (
  "id"                  TEXT               NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reportId"            TEXT               NOT NULL UNIQUE,
  "adminId"             TEXT               NOT NULL,
  "message"             TEXT               NOT NULL,
  "actionTaken"         web."ReportAction",
  "isVisibleToReporter" BOOLEAN            NOT NULL DEFAULT TRUE,
  "createdAt"           TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

  CONSTRAINT "ReportResponse_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES web."Report"("id") ON DELETE CASCADE,
  CONSTRAINT "ReportResponse_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES auth."User"("id") ON DELETE SET NULL
);

-- ─── ForumCategory ───────────────────────────────────────
CREATE TABLE web."ForumCategory" (
  "id"           TEXT    NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"         TEXT    NOT NULL UNIQUE,
  "slug"         TEXT    NOT NULL UNIQUE,
  "description"  TEXT,
  "iconUrl"      TEXT,
  "isOfficial"   BOOLEAN NOT NULL DEFAULT FALSE,
  "displayOrder" INT     NOT NULL DEFAULT 0
);

-- ─── ForumThread ─────────────────────────────────────────
CREATE TABLE web."ForumThread" (
  "id"           TEXT                    NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "title"        TEXT                    NOT NULL,
  "slug"         TEXT                    NOT NULL,           
  "categoryId"   TEXT                    NOT NULL,
  "authorId"     TEXT                    NOT NULL,
  "content"      TEXT                    NOT NULL,
  "imageUrl"     TEXT,
  "postType"     web."ForumPostType"     NOT NULL DEFAULT 'GENERAL',
  "viewCount"    INT                     NOT NULL DEFAULT 0,
  "score"        INT                     NOT NULL DEFAULT 0,
  "commentCount" INT                     NOT NULL DEFAULT 0,
  "isPinned"     BOOLEAN                 NOT NULL DEFAULT FALSE,
  "isLocked"     BOOLEAN                 NOT NULL DEFAULT FALSE,
  "status"       web."ForumThreadStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt"    TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

  UNIQUE ("categoryId", "slug"),

  CONSTRAINT "ForumThread_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES web."ForumCategory"("id"),
  CONSTRAINT "ForumThread_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES auth."User"("id") ON DELETE CASCADE
);

CREATE INDEX "ForumThread_categoryId_createdAt_idx" ON web."ForumThread"("categoryId", "createdAt" DESC);
CREATE INDEX "ForumThread_categoryId_score_idx"     ON web."ForumThread"("categoryId", "score" DESC);
CREATE INDEX "ForumThread_authorId_createdAt_idx"   ON web."ForumThread"("authorId", "createdAt" DESC);

--  Full-text search
CREATE INDEX "ForumThread_fts_idx"
  ON web."ForumThread"
  USING GIN (to_tsvector('simple', "title" || ' ' || "content"));

-- ─── ForumComment ────────────────────────────────────────
CREATE TABLE web."ForumComment" (
  "id"        TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "threadId"  TEXT        NOT NULL,
  "authorId"  TEXT        NOT NULL,
  "content"   TEXT        NOT NULL,
  "parentId"  TEXT,
  "score"     INT         NOT NULL DEFAULT 0,
  "isDeleted" BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "ForumComment_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES web."ForumThread"("id") ON DELETE CASCADE,
  CONSTRAINT "ForumComment_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES auth."User"("id") ON DELETE CASCADE,
  CONSTRAINT "ForumComment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES web."ForumComment"("id") ON DELETE CASCADE
);

CREATE INDEX "ForumComment_threadId_createdAt_idx" ON web."ForumComment"("threadId", "createdAt");
CREATE INDEX "ForumComment_parentId_idx"           ON web."ForumComment"("parentId");

-- ─── ForumThreadVote ─────────────────────────────────────
CREATE TABLE web."ForumThreadVote" (
  "userId"   TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "value"    INT  NOT NULL CHECK ("value" IN (-1, 1)),

  PRIMARY KEY ("userId", "threadId"),
  CONSTRAINT "ForumThreadVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth."User"("id") ON DELETE CASCADE,
  CONSTRAINT "ForumThreadVote_threadId_fkey"
    FOREIGN KEY ("threadId") REFERENCES web."ForumThread"("id") ON DELETE CASCADE
);

CREATE INDEX "ForumThreadVote_threadId_idx" ON web."ForumThreadVote"("threadId");

-- ─── ForumCommentVote ────────────────────────────────────
CREATE TABLE web."ForumCommentVote" (
  "userId"    TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "value"     INT  NOT NULL CHECK ("value" IN (-1, 1)),

  PRIMARY KEY ("userId", "commentId"),
  CONSTRAINT "ForumCommentVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth."User"("id") ON DELETE CASCADE,
  CONSTRAINT "ForumCommentVote_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES web."ForumComment"("id") ON DELETE CASCADE
);

CREATE INDEX "ForumCommentVote_commentId_idx" ON web."ForumCommentVote"("commentId");

-- ─── WikiPage ────────────────────────────────────────────
CREATE TABLE web."WikiPage" (
  "id"               TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "slug"             TEXT        NOT NULL UNIQUE,
  "title"            TEXT        NOT NULL,
  "metadataJson"     JSONB,
  "isPublished"      BOOLEAN     NOT NULL DEFAULT FALSE,
  "latestRevisionId" TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "WikiPage_title_idx"        ON web."WikiPage"("title");
CREATE INDEX "WikiPage_isPublished_idx"  ON web."WikiPage"("isPublished") WHERE "isPublished" = TRUE;
CREATE INDEX "WikiPage_metadata_gin_idx" ON web."WikiPage" USING GIN ("metadataJson");

/*
metadataJson structure (dùng cho infobox, filter, search; KHÔNG phải nội dung bài):
{
  "category": "Character" | "Item" | "Map" | "Mechanic" | "Boss" | "Other",
  "tags": ["kitchen", "boss", "tutorial"],
  "infoboxImage": "https://r2.../image.png",
  "stats": { "stamina": 1, "weight": 2, "speed": 5 },
  "location": "map_01",
  "relatedPages": ["map_01", "Jack"]
}
Query mẫu: WHERE metadataJson->'tags' ? 'boss'
*/

-- ─── WikiRevision ────────────────────────────────────────
CREATE TABLE web."WikiRevision" (
  "id"        TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "pageId"    TEXT        NOT NULL,
  "authorId"  TEXT        NOT NULL,
  "content"   TEXT        NOT NULL,
  "summary"   TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "WikiRevision_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES web."WikiPage"("id") ON DELETE CASCADE,
  CONSTRAINT "WikiRevision_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES auth."User"("id") ON DELETE SET NULL
);

CREATE INDEX "WikiRevision_pageId_createdAt_idx" ON web."WikiRevision"("pageId", "createdAt" DESC);
CREATE INDEX "WikiRevision_authorId_idx"         ON web."WikiRevision"("authorId");

ALTER TABLE web."WikiPage"
  ADD CONSTRAINT "WikiPage_latestRevisionId_fkey"
  FOREIGN KEY ("latestRevisionId") REFERENCES web."WikiRevision"("id") ON DELETE SET NULL;

-- ─── Announcement ────────────────────────────────────────
CREATE TABLE web."Announcement" (
  "id"          TEXT                   NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "authorId"    TEXT                   NOT NULL,
  "slug"        TEXT                   NOT NULL UNIQUE,
  "title"       TEXT                   NOT NULL,
  "summary"     TEXT,
  "content"     TEXT                   NOT NULL,
  "type"        web."AnnouncementType" NOT NULL DEFAULT 'NEWS',
  "isPinned"    BOOLEAN                NOT NULL DEFAULT FALSE,
  "isPublished" BOOLEAN                NOT NULL DEFAULT FALSE,
  "publishedAt" TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "Announcement_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES auth."User"("id") ON DELETE SET NULL
);

CREATE INDEX "Announcement_isPublished_publishedAt_idx"
  ON web."Announcement"("isPublished", "publishedAt" DESC);
CREATE INDEX "Announcement_type_idx" ON web."Announcement"("type");

-- ─── FileAsset ───────────────────────────────────────────
CREATE TABLE web."FileAsset" (
  "id"          TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fileName"    TEXT        NOT NULL,
  "fileVersion" TEXT        NOT NULL UNIQUE,
  "filePath"    TEXT        NOT NULL,
  "fileSize"    BIGINT      NOT NULL,
  "mimeType"    TEXT        NOT NULL,
  "uploadedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DownloadLog ─────────────────────────────────────────
CREATE TABLE web."DownloadLog" (
  "id"           TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"       TEXT,
  "fileAssetId"  TEXT        NOT NULL,
  "bytesSent"    BIGINT      NOT NULL,
  "clientIp"     INET        NOT NULL,                      
  "downloadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "DownloadLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth."User"("id") ON DELETE SET NULL,
  CONSTRAINT "DownloadLog_fileAssetId_fkey"
    FOREIGN KEY ("fileAssetId") REFERENCES web."FileAsset"("id") ON DELETE CASCADE
);

CREATE INDEX "DownloadLog_fileAssetId_idx"  ON web."DownloadLog"("fileAssetId");
CREATE INDEX "DownloadLog_downloadedAt_idx" ON web."DownloadLog"("downloadedAt" DESC);
CREATE INDEX "DownloadLog_userId_idx"       ON web."DownloadLog"("userId") WHERE "userId" IS NOT NULL;

-- ─── DownloadStats ───────────────────────────────────────
CREATE TABLE web."DownloadStats" (
  "id"             TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fileAssetId"    TEXT        NOT NULL,
  "date"           DATE        NOT NULL,
  "downloadCount"  BIGINT      NOT NULL DEFAULT 0,
  "totalBytesSent" BIGINT      NOT NULL DEFAULT 0,

  UNIQUE ("fileAssetId", "date"),
  CONSTRAINT "DownloadStats_fileAssetId_fkey"
    FOREIGN KEY ("fileAssetId") REFERENCES web."FileAsset"("id") ON DELETE CASCADE
);

CREATE INDEX "DownloadStats_fileAssetId_idx" ON web."DownloadStats"("fileAssetId");

-- ─── RateLimit (anti-spam) ──────────────────────
CREATE TABLE web."RateLimitLog" (
  "id"         BIGSERIAL   PRIMARY KEY,
  "userId"     TEXT,
  "ipAddress"  INET,
  "actionType" TEXT        NOT NULL,                         -- 'CREATE_THREAD', 'CREATE_REPORT', etc.
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "RateLimitLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth."User"("id") ON DELETE CASCADE
);

CREATE INDEX "RateLimitLog_user_action_idx"
  ON web."RateLimitLog"("userId", "actionType", "createdAt" DESC);
CREATE INDEX "RateLimitLog_ip_action_idx"
  ON web."RateLimitLog"("ipAddress", "actionType", "createdAt" DESC);
-- Cron job xóa rows cũ hơn 24h

-- ═══════════════════════════════════════════════════════════════
--  FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS public;

-- ─── Trigger: auto updatedAt ─────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE column_name = 'updatedAt'
      AND table_schema IN ('auth','game','web','presence')
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I; CREATE TRIGGER %I BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      r.table_name || '_set_updatedAt',
      r.table_schema, r.table_name,
      r.table_name || '_set_updatedAt',
      r.table_schema, r.table_name
    );
  END LOOP;
END $$;

-- ─── Trigger maintain ForumThread.commentCount ───
CREATE OR REPLACE FUNCTION web.update_thread_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE web."ForumThread"
       SET "commentCount" = "commentCount" + 1
     WHERE "id" = NEW."threadId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE web."ForumThread"
       SET "commentCount" = "commentCount" - 1
     WHERE "id" = OLD."threadId";
  ELSIF TG_OP = 'UPDATE' THEN
    -- Nếu soft-delete: giảm count
    IF OLD."isDeleted" = FALSE AND NEW."isDeleted" = TRUE THEN
      UPDATE web."ForumThread"
         SET "commentCount" = "commentCount" - 1
       WHERE "id" = NEW."threadId";
    ELSIF OLD."isDeleted" = TRUE AND NEW."isDeleted" = FALSE THEN
      UPDATE web."ForumThread"
         SET "commentCount" = "commentCount" + 1
       WHERE "id" = NEW."threadId";
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ForumComment_count_trigger"
  AFTER INSERT OR DELETE OR UPDATE OF "isDeleted"
  ON web."ForumComment"
  FOR EACH ROW
  EXECUTE FUNCTION web.update_thread_comment_count();

-- ─── Trigger maintain ForumThread.score ──────────
CREATE OR REPLACE FUNCTION web.update_thread_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE web."ForumThread"
       SET "score" = "score" + NEW."value"
     WHERE "id" = NEW."threadId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE web."ForumThread"
       SET "score" = "score" - OLD."value"
     WHERE "id" = OLD."threadId";
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE web."ForumThread"
       SET "score" = "score" - OLD."value" + NEW."value"
     WHERE "id" = NEW."threadId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ForumThreadVote_score_trigger"
  AFTER INSERT OR UPDATE OR DELETE
  ON web."ForumThreadVote"
  FOR EACH ROW
  EXECUTE FUNCTION web.update_thread_score();

-- ─── Trigger maintain ForumComment.score ─────────────────
CREATE OR REPLACE FUNCTION web.update_comment_score()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE web."ForumComment"
       SET "score" = "score" + NEW."value"
     WHERE "id" = NEW."commentId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE web."ForumComment"
       SET "score" = "score" - OLD."value"
     WHERE "id" = OLD."commentId";
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE web."ForumComment"
       SET "score" = "score" - OLD."value" + NEW."value"
     WHERE "id" = NEW."commentId";
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ForumCommentVote_score_trigger"
  AFTER INSERT OR UPDATE OR DELETE
  ON web."ForumCommentVote"
  FOR EACH ROW
  EXECUTE FUNCTION web.update_comment_score();

-- ─── Trigger update WikiPage khi có revision mới ─
CREATE OR REPLACE FUNCTION web.update_wiki_page_on_revision()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE web."WikiPage"
     SET "latestRevisionId" = NEW."id",
         "updatedAt"        = NOW()
   WHERE "id" = NEW."pageId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WikiRevision_update_page_trigger"
  AFTER INSERT
  ON web."WikiRevision"
  FOR EACH ROW
  EXECUTE FUNCTION web.update_wiki_page_on_revision();


-- ─── Trigger update GameRun.totalTimeSec từ GameSession ──
/*
 * CREATE OR REPLACE FUNCTION game.update_run_total_time()
RETURNS TRIGGER AS $$
DECLARE
  v_total_sessions   INT;
  v_finished_count   INT;
  v_required_levels  INT;
  v_total_time       INT;
  v_all_won          BOOLEAN;
BEGIN
  -- Chỉ chạy khi session chuyển sang FINISHED
  IF NEW."status" <> 'FINISHED' OR (TG_OP = 'UPDATE' AND OLD."status" = 'FINISHED') THEN
    RETURN NEW;
  END IF;

  SELECT "totalLevels" INTO v_required_levels
    FROM game."GameRun" WHERE "id" = NEW."runId";

  SELECT
    COUNT(*),
    COALESCE(SUM("completionTimeSec"), 0),
    BOOL_AND("result" = 'WIN')
  INTO v_finished_count, v_total_time, v_all_won
  FROM game."GameSession"
  WHERE "runId" = NEW."runId" AND "status" = 'FINISHED';

  -- Run chỉ completed khi đã chơi đủ map VÀ thắng tất cả
  IF v_finished_count >= v_required_levels AND v_all_won THEN
    UPDATE game."GameRun"
       SET "isCompleted"  = TRUE,
           "totalTimeSec" = v_total_time,
           "completedAt"  = NOW()
     WHERE "id" = NEW."runId" AND "isCompleted" = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "GameSession_update_run_trigger"
  AFTER UPDATE OF "status"
  ON game."GameSession"
  FOR EACH ROW
  EXECUTE FUNCTION game.update_run_total_time();
 * */


-- ═══════════════════════════════════════════════════════════════
--  END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════