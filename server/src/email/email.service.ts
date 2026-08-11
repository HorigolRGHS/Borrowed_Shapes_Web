import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger('EmailService');
  private readonly from: string;

  constructor(private config: ConfigService) {
    const host = this.config.get('MAIL_HOST');
    const port = parseInt(this.config.get('MAIL_PORT', '587'), 10);
    const user = this.config.get('MAIL_USER');
    const pass = this.config.get('MAIL_PASS');
    this.from = this.config.get('MAIL_FROM', 'borrowedshapes@gmail.com');

    // Init transporter
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: this.config.get('NODE_ENV') === 'production',
      },
    });

    if (host && port && user && pass) {
      this.transporter.verify((err: Error | null, success: boolean) => {
        if (err) {
          this.logger.error(`Mail transporter verify failed: ${err.message}`);
        } else if (success) {
          this.logger.log('Mail transporter verified');
        }
      });
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send email to ${to}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  public renderBaseEmailTemplate(title: string, bodyHtml: string, isCentered: boolean = false): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #07070f; font-family: 'Arial', sans-serif;">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #07070f; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0b0b17; border-radius: 16px; border: 1px solid #1e1e3a; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td align="center" style="padding: 40px 0 20px 0; background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">Borrowed Shapes</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 32px; color: #d1d5db; font-size: 16px; line-height: 1.6; text-align: ${isCentered ? 'center' : 'left'};">
                    <h2 style="color: #22d3ee; margin: 0 0 24px 0; font-size: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; ${isCentered ? '' : 'text-align: center;'}">${title}</h2>
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 32px; background-color: #080812; border-top: 1px solid #1a1a2e; text-align: center;">
                    <p style="color: #64748b; font-size: 13px; margin: 0 0 8px 0; line-height: 1.5;">
                      This is an automated message from <strong>Borrowed Shapes</strong>.<br/>
                      Please do not reply directly to this email.
                    </p>
                    <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 1.5;">
                      Contact: <a href="mailto:contact@borrowedshapes.id.vn" style="color: #7c3aed; text-decoration: none; font-weight: 600;">contact@borrowedshapes.id.vn</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  async sendReportResolvedEmail(params: {
    to: string;
    displayName: string;
    status: string;
    actionTaken: string;
    adminMessage?: string | null;
  }): Promise<void> {
    const subject = '[Borrowed Shapes] Your report has been resolved';
    const visibleMsg = params.adminMessage
      ? `<div style="background-color: #161625; padding: 15px; border-left: 4px solid #7c3aed; margin: 20px 0; border-radius: 6px; color: #e2e8f0; font-style: italic;">
           &ldquo;${params.adminMessage}&rdquo;
         </div>`
      : '';

    const bodyHtml = `
      <p>Hello <strong>${params.displayName}</strong>,</p>
      <p>Thank you for keeping <strong>Borrowed Shapes</strong> safe. The report you submitted has been reviewed and resolved by our moderation team.</p>
      
      <div style="background-color: #1e1e2d; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px; border: 1px solid #2d2d44;">
        <p style="margin: 0 0 8px 0;"><strong>Report Status:</strong> <span style="color: #10b981; font-weight: bold;">${params.status}</span></p>
        <p style="margin: 0;"><strong>Action Taken:</strong> <span style="color: #fbbf24; font-weight: bold;">${params.actionTaken}</span></p>
      </div>
      
      ${visibleMsg}
      
      <p>We appreciate your contribution to maintaining a positive community environment.</p>
    `;

    await this.sendMail(
      params.to,
      subject,
      this.renderBaseEmailTemplate(subject, bodyHtml),
    );
  }

  async sendReportWarningEmail(params: {
    to: string;
    displayName: string;
    reason: string;
  }): Promise<void> {
    const subject = '[Borrowed Shapes] Official Warning Notice';
    const bodyHtml = `
      <p>Hello <strong>${params.displayName}</strong>,</p>
      <p>This is an official warning notification regarding your recent activity on the <strong>Borrowed Shapes</strong> platform.</p>
      <p>Your content was flagged and found to violate our community guidelines.</p>
      
      <div style="background-color: #2a1b1b; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 8px; border: 1px solid #4a2d1d;">
        <h4 style="margin: 0 0 10px 0; color: #fbbf24; font-size: 16px;">Warning Reason:</h4>
        <p style="margin: 0; color: #e2e8f0; line-height: 1.5; font-style: italic;">&ldquo;${params.reason}&rdquo;</p>
      </div>
      
      <p style="color: #ef4444; font-weight: 600;">Please review the platform rules and community guidelines. Further violations may result in temporary or permanent restriction of your account.</p>
    `;

    await this.sendMail(
      params.to,
      subject,
      this.renderBaseEmailTemplate(subject, bodyHtml),
    );
  }

  async sendReportRejectedEmail(params: {
    to: string;
    displayName: string;
    adminMessage?: string | null;
  }): Promise<void> {
    const subject = '[Borrowed Shapes] Your report has been reviewed';
    const visibleMsg = params.adminMessage
      ? `<div style="background-color: #161625; padding: 15px; border-left: 4px solid #6b7280; margin: 20px 0; border-radius: 6px; color: #e2e8f0; font-style: italic;">
           &ldquo;${params.adminMessage}&rdquo;
         </div>`
      : '';

    const bodyHtml = `
      <p>Hello <strong>${params.displayName}</strong>,</p>
      <p>Thank you for contacting us. The report you submitted has been reviewed by our moderation team.</p>
      <p>Based on our investigation, the reported content does not violate platform rules at this time, or no further action was deemed necessary. As a result, the report has been dismissed.</p>
      
      ${visibleMsg}
      
      <p>We appreciate your diligence in reporting potential issues to us.</p>
    `;

    await this.sendMail(
      params.to,
      subject,
      this.renderBaseEmailTemplate(subject, bodyHtml),
    );
  }

  async sendAccountBannedEmail(params: {
    to: string;
    displayName: string;
    reason?: string | null;
    banExpiresAt?: Date | string | null;
  }): Promise<void> {
    const subject = 'Your Borrowed Shapes account has been restricted';

    let durationText = 'Permanent';
    if (params.banExpiresAt) {
      try {
        const d = new Date(params.banExpiresAt);
        durationText = `Until ${new Intl.DateTimeFormat('en-US', {
          dateStyle: 'long',
          timeZone: 'Asia/Ho_Chi_Minh',
        }).format(d)}`;
      } catch (e) {
        durationText = String(params.banExpiresAt);
      }
    }

    const reasonText = params.reason || 'No specific reason was provided.';

    const bodyHtml = `
      <p>Hello ${params.displayName},</p>
      <p>We are contacting you to let you know that your Borrowed Shapes account has been restricted by an administrator.</p>
      
      <div style="background-color: #262626; padding: 15px; border-left: 4px solid #b91c1c; margin: 20px 0; border-radius: 4px;">
        <p style="margin-top: 0; margin-bottom: 8px;"><strong>Reason:</strong><br/>${reasonText}</p>
        <p style="margin: 0;"><strong>Restriction duration:</strong><br/>${durationText}</p>
      </div>

      <p>While your account is restricted, you may not be able to access some features of Borrowed Shapes, including account-related services, community features, or game-related systems.</p>
      <p>If you believe this action was made by mistake, please contact the Borrowed Shapes team through the official contact channels.</p>
    `;

    await this.sendMail(
      params.to,
      subject,
      this.renderBaseEmailTemplate(subject, bodyHtml),
    );
  }

  async sendAccountUnbannedEmail(params: {
    to: string;
    displayName: string;
  }): Promise<void> {
    const subject = 'Your Borrowed Shapes account has been restored';

    const bodyHtml = `
      <p>Hello ${params.displayName},</p>
      <p>Your Borrowed Shapes account restriction has been lifted.</p>
      <p>You can now access your account and available Borrowed Shapes features again, subject to the platform rules and community guidelines.</p>
      <p>Thank you for your understanding.</p>
    `;

    await this.sendMail(
      params.to,
      subject,
      this.renderBaseEmailTemplate(subject, bodyHtml),
    );
  }

  async sendAccountDeletedEmail(params: {
    to: string;
    displayName: string;
  }): Promise<void> {
    // Note: Project currently uses soft-delete via deletedAt, so we use "deactivated" wording
    const subject = 'Your Borrowed Shapes account has been deactivated';

    const bodyHtml = `
      <p>Hello ${params.displayName},</p>
      <p>Your Borrowed Shapes account has been deactivated by an administrator.</p>
      <p>This means you may no longer be able to access your account, profile, community features, download history, or gameplay-related account data through the Borrowed Shapes platform.</p>
      <p>If you believe this action was made by mistake, please contact the Borrowed Shapes team through the official contact channels.</p>
    `;

    await this.sendMail(
      params.to,
      subject,
      this.renderBaseEmailTemplate(subject, bodyHtml),
    );
  }
}
