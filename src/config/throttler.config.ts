import { registerAs } from '@nestjs/config';

export default registerAs('throttler', () => ({
  global: {
    ttl: parseInt(process.env.THROTTLER_GLOBAL_TTL || '900000', 10),
    limit: parseInt(process.env.THROTTLER_GLOBAL_LIMIT || '60', 10),
  },
  login: {
    ttl: parseInt(process.env.THROTTLER_LOGIN_TTL || '900000', 10),
    limit: parseInt(process.env.THROTTLER_LOGIN_LIMIT || '5', 10),
  },
  signup: {
    ttl: parseInt(process.env.THROTTLER_SIGNUP_TTL || '900000', 10),
    limit: parseInt(process.env.THROTTLER_SIGNUP_LIMIT || '5', 10),
  },
  forgetPassword: {
    ttl: parseInt(process.env.THROTTLER_FORGET_PASSWORD_TTL || '900000', 10),
    limit: parseInt(process.env.THROTTLER_FORGET_PASSWORD_LIMIT || '3', 10),
  },
  refresh: {
    ttl: parseInt(process.env.THROTTLER_REFRESH_TTL || '900000', 10),
    limit: parseInt(process.env.THROTTLER_REFRESH_LIMIT || '10', 10),
  },
}));
