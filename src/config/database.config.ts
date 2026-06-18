import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  type: 'postgres';
  url?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: { rejectUnauthorized: boolean };
}
export default registerAs(
  'database',
  (): DatabaseConfig => ({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'nexus_flow',
    ssl:
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
  }),
);
