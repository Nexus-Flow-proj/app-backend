import { registerAs } from '@nestjs/config';
import { normalizeOrigin } from '@shared/utils/url.util';

export default registerAs('mail', () => ({
  brevoApiKey: process.env.BREVO_API_KEY || '',
  from: process.env.MAIL_FROM || 'nexusflow.proj@gmail.com',
  fromName: process.env.MAIL_FROM_NAME || 'NexusFlow',
  frontendUrl: normalizeOrigin(
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ),
}));
