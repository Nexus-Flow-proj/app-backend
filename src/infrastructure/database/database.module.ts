import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigType } from '@nestjs/config';
import databaseConfig from '../../config/database.config';
import { isProduction } from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forFeature(databaseConfig)],
      inject: [databaseConfig.KEY],
      useFactory: (dbConfig: ConfigType<typeof databaseConfig>) => ({
        type: dbConfig.type,
        ...(dbConfig.url
          ? { url: dbConfig.url }
          : {
              host: dbConfig.host,
              port: dbConfig.port,
              username: dbConfig.username,
              password: dbConfig.password,
              database: dbConfig.database,
            }),
        entities: [__dirname + '/../../modules/**/*.entity.{js,ts}'],
        ssl: dbConfig.ssl,
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
