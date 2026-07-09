import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
  refreshSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
  accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
}));
