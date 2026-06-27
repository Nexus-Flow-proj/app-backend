import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { passwordResetTemplate } from './templates/password-reset.template';
import { projectInviteTemplate } from './templates/project-invite.template';

@Injectable()
export class MailService {
  private resend: Resend;
  private from: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(
      this.configService.get<string>('mail.resendApiKey'),
    );
    this.from = this.configService.get<string>('mail.from')!;
  }

  async sendPasswordReset(email: string, resetUrl: string): Promise<void> {
    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Reset your password',
      html: passwordResetTemplate(resetUrl),
    });
  }

  async sendProjectInvite(
    email: string,
    projectName: string,
    inviterName: string,
    inviteLink: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.resend.emails.send({
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
  }
}
