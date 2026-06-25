import { registerAs } from '@nestjs/config';
import { normalizeOrigin } from '@shared/utils/url.util';

export default registerAs('mail', () => ({
  resendApiKey: process.env.RESEND_API_KEY || '',
  from: process.env.MAIL_FROM || 'onboarding@resend.dev',
  frontendUrl: normalizeOrigin(
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ),
}));
