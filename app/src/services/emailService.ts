import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { EmailServiceUnavailableError } from '../errors/AppError';

export interface IEmailDeliveryService {
  isConfigured(): boolean;
  sendOtpEmail(toEmail: string, otpCode: string): Promise<void>;
}

export class SmtpEmailService implements IEmailDeliveryService {
  private transporter: Transporter | null = null;

  constructor(customTransporter?: Transporter) {
    if (customTransporter) {
      this.transporter = customTransporter;
    } else if (env.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
              }
            : undefined,
      });
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendOtpEmail(toEmail: string, otpCode: string): Promise<void> {
    if (!this.transporter) {
      throw new EmailServiceUnavailableError(
        'Email delivery is not configured on this server. Please configure SMTP credentials (SMTP_HOST, SMTP_PORT, etc.).'
      );
    }

    try {
      await this.transporter.sendMail({
        from: env.EMAIL_FROM,
        to: toEmail,
        subject: 'CampusConnect - Your Verification Code',
        text: `Hello,\n\nYour 6-digit CampusConnect verification code is:\n\n${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, you can safely ignore this email.\n\n— CampusConnect Team`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #1e3a8a; margin-top: 0;">CampusConnect Verification</h2>
            <p style="color: #4b5563; font-size: 15px;">Use the 6-digit code below to complete your sign-in:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; margin: 24px 0; padding: 12px; background: #f3f4f6; border-radius: 6px; color: #111827;">
              ${otpCode}
            </div>
            <p style="color: #6b7280; font-size: 13px;">This code will expire in 10 minutes. If you did not request this code, no action is needed.</p>
          </div>
        `,
      });
    } catch (err: any) {
      // Security rule: Never log the otpCode or include credentials in log
      console.error('SMTP email delivery failed:', err?.message || err);
      throw new EmailServiceUnavailableError('Failed to deliver verification email. Please try again later.');
    }
  }
}
