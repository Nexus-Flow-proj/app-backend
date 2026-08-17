import { registerAs } from '@nestjs/config';
import { normalizeOrigin } from '@shared/utils/url.util';

export default registerAs('mail', () => ({
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  frontendUrl: normalizeOrigin(
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ),
}));
