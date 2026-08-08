CREATE OR REPLACE FUNCTION game.award_monthly_top(p_month DATE DEFAULT NULL)
RETURNS TABLE(rank INT, team_id TEXT, "runId" TEXT, members TEXT[])
AS $$
DECLARE
  v_month DATE := COALESCE(p_month, date_trunc('month', NOW() - interval '1 month')::date);
BEGIN
  CREATE TEMP TABLE _monthly_rank ON COMMIT DROP AS
  WITH run_members AS (
    -- Roster thực tế của từng GameRun đã hoàn thành trong tháng
    SELECT
      r."id"           AS run_id,
      r."totalTimeSec" AS total_time,
      array_agg(p."gameProfileId" ORDER BY p."gameProfileId") AS member_set
    FROM game."GameRun" r
    JOIN game."GameRunPlayer" p ON p."runId" = r."id"
    WHERE r."isCompleted"
      AND date_trunc('month', r."completedAt") = v_month
    GROUP BY r."id", r."totalTimeSec"
  ),
  team_members AS (
    -- Roster đã đăng ký của từng SeasonTeam trong tháng
    SELECT
      st."id" AS team_id,
      array_agg(stm."gameProfileId" ORDER BY stm."gameProfileId") AS member_set
    FROM game."SeasonTeam" st
    JOIN game."SeasonTeamMember" stm
      ON stm."teamId" = st."id" AND stm."seasonMonth" = st."seasonMonth"
    WHERE st."seasonMonth" = v_month
    GROUP BY st."id"
  ),
  matched_runs AS (
    -- Giữ GameRun mà member_set là TẬP CON của 1 SeasonTeam (cho phép thiếu người)
    SELECT
      tm.team_id,
      rm.run_id,
      rm.total_time,
      rm.member_set  AS run_member_set,
      tm.member_set  AS team_member_set   -- roster đầy đủ để phát thưởng
    FROM run_members rm
    JOIN team_members tm ON rm.member_set <@ tm.member_set
  ),
  best_run_per_team AS (
    -- Mỗi team chỉ tính 1 lần: lấy run nhanh nhất khớp (subset) trong tháng
    SELECT DISTINCT ON (team_id)
      team_id, run_id, total_time, run_member_set, team_member_set
    FROM matched_runs
    ORDER BY team_id, total_time ASC
  )
  -- Xếp hạng giữa các TEAM, top 5
  SELECT
    row_number() OVER (ORDER BY total_time ASC)::INT AS rnk,
    team_id,
    run_id,
    team_member_set AS member_set   -- dùng full roster của team để phát thưởng
  FROM best_run_per_team
  ORDER BY total_time ASC
  LIMIT 5;

  -- Phát achievement cho TOÀN BỘ thành viên đã đăng ký của team đạt hạng
  INSERT INTO game."UserAchievement"("gameProfileId", "achievementId")
  SELECT unnest(mr.member_set), a."id"
  FROM _monthly_rank mr
  JOIN game."Achievement" a
    ON a."seasonMonth"  = v_month
   AND a."criteriaCode" = 'SEASON_TOP_' || mr.rnk
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT rnk, team_id, run_id, member_set FROM _monthly_rank ORDER BY rnk;
END;
$$ LANGUAGE plpgsql;

-- Schedule the job to run at 00:05 on the 1st of every month using pg_cron
-- SELECT cron.unschedule('award_monthly_top_job');
SELECT cron.schedule('award_monthly_top_job', '5 0 1 * *', 'SELECT game.award_monthly_top();');