import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../../modules/users/entities/user.entity';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import { Skill } from '../../modules/users/entities/skill.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nexusflow_db',
  synchronize: false,
  logging: true,
  entities: [User, Skill, RefreshToken],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
});
