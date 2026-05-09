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
      this.logger.error(`Failed to send email to ${to}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
