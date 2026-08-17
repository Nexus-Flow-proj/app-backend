import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { passwordResetTemplate } from './templates/password-reset.template';
import { projectInviteTemplate } from './templates/project-invite.template';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(private configService: ConfigService) {
    const smtpUser = this.configService.get<string>('mail.smtpUser')!;
    const smtpPass = this.configService.get<string>('mail.smtpPass')!;
    this.from = this.configService.get<string>('mail.from') || smtpUser;

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use STARTTLS (upgraded after connection)
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (err) {
      this.logger.error(
        'SMTP connection failed — check SMTP_USER / SMTP_PASS env vars',
        err,
      );
    }
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: 'Reset your password',
        html: passwordResetTemplate(resetUrl),
      });
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err);
      throw err;
    }
  }

  async sendProjectInvite(
    email: string,
    projectName: string,
    inviterName: string,
    inviteLink: string,
    expiresAt: Date,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: email,
        subject: `Invitation to join ${projectName}`,
        html: projectInviteTemplate(
          projectName,
          inviterName,
          inviteLink,
          expiresAt.toISOString(),
        ),
      });
    } catch (err) {
      this.logger.error(
        `Failed to send project invite email to ${email}`,
        err,
      );
      throw err;
    }
  }
}

