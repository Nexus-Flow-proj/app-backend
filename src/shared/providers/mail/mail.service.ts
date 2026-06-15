import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { passwordResetTemplate } from './templates/password-reset.template';

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
}
