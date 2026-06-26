import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nexus_flow',
  url: isProduction ? process.env.DATABASE_URL : '',
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
  synchronize: false,
  logging: true,
  entities: [__dirname + '/../../modules/**/*.entity.{js,ts}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});
