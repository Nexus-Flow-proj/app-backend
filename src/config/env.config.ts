import { registerAs } from '@nestjs/config';
import { normalizeOrigin } from '@shared/utils/url.util';

export interface EnvConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  accessTokenCookieMaxAge: number;
  refreshTokenCookieMaxAge: number;
  csrfTokenCookieMaxAge: number;
}

export default registerAs('env', () => ({
  port: parseInt(process.env.PORT || '', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: normalizeOrigin(
    process.env.FRONTEND_URL || 'http://localhost:3000',
  ),
  accessTokenCookieMaxAge: parseInt(
    process.env.ACCESS_TOKEN_COOKIE_MAX_AGE || '1800000',
    10,
  ),
  refreshTokenCookieMaxAge: parseInt(
    process.env.REFRESH_TOKEN_COOKIE_MAX_AGE || '604800000',
    10,
  ),
  csrfTokenCookieMaxAge: parseInt(
    process.env.CSRF_TOKEN_COOKIE_MAX_AGE || '3600000',
    10,
  ),
}));
