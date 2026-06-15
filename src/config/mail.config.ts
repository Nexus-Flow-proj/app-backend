import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  resendApiKey: process.env.RESEND_API_KEY || '',
  from: process.env.MAIL_FROM || 'onboarding@resend.dev',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
}));
