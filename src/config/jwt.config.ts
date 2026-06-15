import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_TOKEN_SECRET,
  refreshSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
}));
