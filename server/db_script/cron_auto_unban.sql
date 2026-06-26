-- Create pg_cron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Create the auto-unban function
CREATE OR REPLACE FUNCTION auth.auto_unban_expired_users()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  WITH expired_users AS (
    SELECT
      "id",
      "bannedAt",
      "banReason",
      "banExpiresAt"
    FROM auth."User"
    WHERE "isBanned" = TRUE
      AND "banExpiresAt" IS NOT NULL
      AND "banExpiresAt" <= NOW()
    FOR UPDATE
  ),
  updated_users AS (
    UPDATE auth."User" u
    SET
      "isBanned" = FALSE,
      "bannedAt" = NULL,
      "banReason" = NULL,
      "banExpiresAt" = NULL,
      "updatedAt" = NOW()
    FROM expired_users e
    WHERE u."id" = e."id"
    RETURNING
      u."id",
      e."bannedAt" AS old_banned_at,
      e."banReason" AS old_ban_reason,
      e."banExpiresAt" AS old_ban_expires_at
  ),
  inserted_logs AS (
    INSERT INTO auth."AuditLog" (
      "userId",
      "actionType",
      "entityName",
      "entityId",
      "oldValue",
      "newValue",
      "timestamp",
      "ipAddress"
    )
    SELECT
      NULL,
      'UNBAN_USER',
      'User',
      u."id",
      jsonb_build_object(
        'isBanned', TRUE,
        'bannedAt', u.old_banned_at,
        'banReason', u.old_ban_reason,
        'banExpiresAt', u.old_ban_expires_at
      ),
      jsonb_build_object(
        'isBanned', FALSE,
        'bannedAt', NULL,
        'banReason', NULL,
        'banExpiresAt', NULL,
        'auto', TRUE,
        'reason', 'BAN_EXPIRED_AUTO_UNBAN',
        'source', 'DB_CRON'
      ),
      NOW(),
      NULL
    FROM updated_users u
    RETURNING "id"
  )
  SELECT COUNT(*) INTO v_count FROM inserted_logs;

  RETURN v_count;
END;
$$;

-- 2. Safely unschedule any existing job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-unban-expired-users') THEN
    PERFORM cron.unschedule('auto-unban-expired-users');
  END IF;
END $$;

-- 3. Schedule the cron job
-- DB Timezone is Etc/UTC. 17:05 UTC = 00:05 Vietnam Time.
SELECT cron.schedule(
  'auto-unban-expired-users',
  '5 17 * * *',
  $$SELECT auth.auto_unban_expired_users();$$
);
