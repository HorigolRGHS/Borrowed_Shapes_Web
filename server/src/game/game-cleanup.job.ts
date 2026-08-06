import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
        // Find runs that are not completed and have no completedAt
        const runs = await em.find(
          GameRun,
          { isCompleted: false, completedAt: null },
          { populate: ['sessions'] },
        );

        let updatedCount = 0;
        const now = new Date();

        for (const run of runs) {
          // Sort sessions by startedAt ascending
          const sortedSessions = [...run.sessions].sort(
            (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
          );
          
          const lastSession = sortedSessions[sortedSessions.length - 1];

          let shouldEnd = false;
          let derivedCompletedAt: Date | undefined;

          if (lastSession) {
            if (
              lastSession.status === GameSessionStatus.ABANDONED ||
              lastSession.status === GameSessionStatus.FINISHED ||
              lastSession.endedAt
            ) {
              shouldEnd = true;
              derivedCompletedAt = lastSession.endedAt || lastSession.startedAt;
            } else {
              // The session is still IN_PROGRESS. Check if it's older than 12 hours
              const hoursElapsed =
                (now.getTime() - run.startedAt.getTime()) / (1000 * 60 * 60);
              if (hoursElapsed > 12) {
                shouldEnd = true;
                derivedCompletedAt = new Date(
                  run.startedAt.getTime() + 12 * 60 * 60 * 1000,
                );
                
                // Force end the stuck session too
                lastSession.status = GameSessionStatus.ABANDONED;
                lastSession.result = SessionResult.ABANDONED;
                lastSession.endedAt = derivedCompletedAt;
                em.persist(lastSession);
              }
            }
          } else {
            // No sessions at all? Check if > 12 hours
            const hoursElapsed =
              (now.getTime() - run.startedAt.getTime()) / (1000 * 60 * 60);
            if (hoursElapsed > 12) {
              shouldEnd = true;
              derivedCompletedAt = new Date(
                run.startedAt.getTime() + 12 * 60 * 60 * 1000,
              );
            }
          }

          if (shouldEnd && derivedCompletedAt) {
            run.completedAt = derivedCompletedAt;
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
