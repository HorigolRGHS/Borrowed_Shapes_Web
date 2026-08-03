import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { AchievementService } from './achievements.service';
import { EmailService } from '../email/email.service';
import { User } from '../entities/User';

@Injectable()
export class AchievementsCheckJob {
  private readonly logger = new Logger(AchievementsCheckJob.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly achievementService: AchievementService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('5 0 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Run once every day at 00:05 AM
  async checkAndRemindTopAchievements(): Promise<void> {
    await RequestContext.create(this.orm.em, async () => {
      try {
        const now = new Date();
        const date = now.getDate();

        // Only run from day 28 to the end of the month
        if (date < 28) return;

        const hasAll = await this.achievementService.checkNextMonthTopAchievements();
        if (hasAll) {
          this.logger.log('Top achievements for next month are ready.');
          return;
        }

        this.logger.warn(
          'Missing top achievements for next month! Sending reminder emails to admins.',
        );

        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const monthString = `${String(nextMonth.getMonth() + 1).padStart(2, '0')}/${nextMonth.getFullYear()}`;

        const admins = await this.orm.em.find(User, {
          role: 'ADMIN',
          deletedAt: null,
          isBanned: false,
        });

        const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0] || 'http://localhost:3000';
        const dashboardUrl = `${frontendUrl}/dashboard/achievements`;

        const subject = `[Borrowed Shapes] Reminder: Missing TOP Achievements for ${monthString}`;
        const content = `
          <p>Hello <strong>Admin</strong>,</p>
          <p>The system has detected that there are <strong>less than 5 TOP Achievements created for the upcoming month (${monthString})</strong>.</p>
          
          <div style="background-color: #2a1b1b; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 8px; border: 1px solid #4a2d1d;">
            <h4 style="margin: 0 0 10px 0; color: #fbbf24; font-size: 16px;">Action Required:</h4>
            <p style="margin: 0 0 15px 0; color: #e2e8f0; font-size: 14px;">Please log in to the admin dashboard and create all 5 seasonal TOP achievements (from SEASON_TOP_1 to SEASON_TOP_5) immediately. This is critical for the system to automatically calculate rankings and grant awards to players at the beginning of next month.</p>
            <a href="${dashboardUrl}" style="display: inline-block; background-color: #f59e0b; color: #1e1e2d; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">Go to Achievements Management</a>
          </div>
          
          <p>Best regards,<br>Borrowed Shapes System</p>
        `;

        const html = this.emailService.renderBaseEmailTemplate(subject, content);

        for (const admin of admins) {
          await this.emailService.sendMail(admin.email, subject, html);
        }

        this.logger.log(`Sent reminder emails to ${admins.length} admins.`);
      } catch (err) {
        this.logger.error('Failed to run achievements check job', err);
      }
    });
  }
}
