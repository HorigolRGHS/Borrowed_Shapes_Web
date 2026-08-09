import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { GameRun } from '../entities/GameRun';
import { GameSession } from '../entities/GameSession';
import { GameSessionStatus } from '../entities/GameSessionStatus';
import { SessionResult } from '../entities/SessionResult';

@Injectable()
export class GameCleanupJob {
  private readonly logger = new Logger(GameCleanupJob.name);

  constructor(private readonly em: EntityManager) {}

  @Cron('0 */2 * * * *') // Every 2 minutes
  async handleAbandonedRuns() {
    this.logger.debug('Running game cleanup job to find abandoned runs...');

    try {
      await this.em.fork().transactional(async (em) => {
        const runs = await em.find(
          GameRun,
          { isCompleted: false, $or: [{ completedAt: null }, { totalTimeSec: null }] }
        );

        let updatedCount = 0;
        const now = new Date();
        const TWO_MINUTES_MS = 2 * 60 * 1000;
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

        for (const run of runs) {
          // Manually find sessions for this run, ordered by startedAt
          const sortedSessions = await em.find(
            GameSession,
            { runId: run.id },
            { orderBy: { startedAt: 'ASC' } }
          );

          const lastSession = sortedSessions[sortedSessions.length - 1];

          let shouldEnd = false;
          let derivedCompletedAt: Date | undefined;

          if (lastSession) {
            if (
              lastSession.status === GameSessionStatus.ABANDONED &&
              lastSession.endedAt
            ) {
              // Guard: only close the run if the session has been abandoned for at least 2 minutes.
              // This prevents the job from firing while a map-reset is mid-flight
              // (Unity sends ABANDONED → endSession → then immediately opens a new session).
              const abandonedAgoMs = now.getTime() - new Date(lastSession.endedAt).getTime();
              if (abandonedAgoMs >= TWO_MINUTES_MS) {
                shouldEnd = true;
                derivedCompletedAt = new Date(lastSession.endedAt);
              }
            } else if (
              lastSession.status === GameSessionStatus.FINISHED &&
              lastSession.endedAt
            ) {
              // A FINISHED session where endRun was never called — close the run immediately.
              shouldEnd = true;
              derivedCompletedAt = new Date(lastSession.endedAt);
            } else {
              // Session still IN_PROGRESS (crash / network loss). Wait 12 hours before forcing close.
              const stuckForMs = now.getTime() - new Date(lastSession.startedAt).getTime();
              if (stuckForMs > TWELVE_HOURS_MS) {
                shouldEnd = true;
                derivedCompletedAt = new Date(
                  new Date(lastSession.startedAt).getTime() + TWELVE_HOURS_MS,
                );
                lastSession.status = GameSessionStatus.ABANDONED;
                lastSession.result = SessionResult.ABANDONED;
                lastSession.endedAt = derivedCompletedAt;
                em.persist(lastSession);
              }
            }
          } else {
            // Run has no sessions at all — opened but never used (crash at lobby before any map).
            const runStart = new Date(run.startedAt);
            if (now.getTime() - runStart.getTime() > TWELVE_HOURS_MS) {
              shouldEnd = true;
              derivedCompletedAt = new Date(runStart.getTime() + TWELVE_HOURS_MS);
            }
          }

          if (shouldEnd && derivedCompletedAt) {
            // Calculate total time for all non-lobby sessions that finished/abandoned
            const totalTimeSec = sortedSessions
              .filter((s) => {
                const lvlId = typeof s.levelId === 'string' ? s.levelId : s.levelId?.id;
                return lvlId !== 'lobby';
              })
              .reduce((sum, s) => sum + (s.completionTimeSec ?? 0), 0);

            run.completedAt = derivedCompletedAt;
            run.totalTimeSec = totalTimeSec;
            em.persist(run);
            updatedCount++;
          }
        }

        if (updatedCount > 0) {
          this.logger.log(`Cleaned up ${updatedCount} abandoned game runs.`);
          await em.flush();
        }
      });
    } catch (error) {
      this.logger.error('Failed to run game cleanup job', error);
    }
  }
}
