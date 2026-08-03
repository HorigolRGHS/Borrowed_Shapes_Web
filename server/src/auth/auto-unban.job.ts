import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MikroORM, RequestContext, LockMode } from '@mikro-orm/core';
import { User } from '../entities/User';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../entities/AuditActionType';

@Injectable()
export class AutoUnbanJob {
  private readonly logger = new Logger(AutoUnbanJob.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly auditService: AuditService,
  ) {}

  @Cron('0 * * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async handleAutoUnban(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      // this.logger.log('Started auto-unban job.');
      const startTime = Date.now();
      let processedUsers = 0;

      try {
        await this.orm.em.transactional(async (em) => {
          const currentTime = new Date();
          // Find expired users and lock them
          const expiredUsers = await em.find(
            User,
            {
              isBanned: true,
              banExpiresAt: { $lte: currentTime },
            },
            { lockMode: LockMode.PESSIMISTIC_WRITE },
          );

          for (const user of expiredUsers) {
            const oldBannedAt = user.bannedAt;
            const oldBanReason = user.banReason;
            const oldBanExpiresAt = user.banExpiresAt;

            user.isBanned = false as any;
            user.bannedAt = undefined;
            user.banReason = undefined;
            user.banExpiresAt = undefined;

            await this.auditService.recordInCurrentUnitOfWork({
              actionType: AuditActionType.UNBAN_USER,
              userId: user.id,
              entityName: 'User',
              entityId: user.id,
              oldValue: {
                isBanned: true,
                bannedAt: oldBannedAt,
                banReason: oldBanReason,
                banExpiresAt: oldBanExpiresAt,
              },
              newValue: {
                operation: 'AUTO_UNBAN',
                isBanned: false,
                bannedAt: null,
                banReason: null,
                banExpiresAt: null,
                auto: true,
                reason: 'BAN_EXPIRED_AUTO_UNBAN',
                source: 'NODE_CRON',
              },
              ipAddress: null,
            });

            processedUsers++;
          }

          if (processedUsers > 0) {
            await em.flush();
          }
        });

        const duration = Date.now() - startTime;
        // this.logger.log(
        //   `Finished auto-unban job. Processed users: ${processedUsers}. Duration: ${duration}ms.`,
        // );
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger.error(
          `Error executing auto-unban job after ${duration}ms. Processed users so far: ${processedUsers}.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    });
  }
}
