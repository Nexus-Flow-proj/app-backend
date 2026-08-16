import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const isProduction = process.env.NODE_ENV === 'production';
const useSsl =
  process.env.DB_SSL === 'true' ||
  isProduction ||
  Boolean(process.env.DATABASE_URL);

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'nexus_flow',
      }),
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  synchronize: false,
  logging: true,
  entities: [__dirname + '/../../modules/**/*.entity.{js,ts}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});
