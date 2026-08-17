import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import { passwordResetTemplate } from './templates/password-reset.template';
import { projectInviteTemplate } from './templates/project-invite.template';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly brevo: BrevoClient;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('mail.brevoApiKey') || '';
    this.fromEmail =
      this.configService.get<string>('mail.from') || 'nexusflow.proj@gmail.com';
    this.fromName =
      this.configService.get<string>('mail.fromName') || 'NexusFlow';

    this.brevo = new BrevoClient({ apiKey });
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    try {
      await this.brevo.transactionalEmails.sendTransacEmail({
        subject: 'Reset your password',
        htmlContent: passwordResetTemplate(resetUrl),
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email }],
      });
    } catch (err: any) {
      const errorMsg =
        err?.response?.body?.message || err?.message || 'Unknown error';
      this.logger.error(
        `Failed to send password reset email to ${email}: ${errorMsg}`,
        err?.stack,
      );
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
      await this.brevo.transactionalEmails.sendTransacEmail({
        subject: `Invitation to join ${projectName}`,
        htmlContent: projectInviteTemplate(
          projectName,
          inviterName,
          inviteLink,
          expiresAt.toISOString(),
        ),
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email }],
      });
    } catch (err: any) {
      const errorMsg =
        err?.response?.body?.message || err?.message || 'Unknown error';
      this.logger.error(
        `Failed to send project invite email to ${email}: ${errorMsg}`,
        err?.stack,
      );
      throw err;
    }
  }
}



