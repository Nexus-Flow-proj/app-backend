import { registerAs } from '@nestjs/config';
import { normalizeOrigin } from '@shared/utils/url.util';

export default registerAs('env', () => ({
  port: parseInt(process.env.PORT || '', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: normalizeOrigin(
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ),
}));
