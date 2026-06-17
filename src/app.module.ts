import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from './config/database.config';
import envConfig from './config/env.config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import jwtConfig from './config/jwt.config';
import mailConfig from 'config/mail.config';
import throttlerConfig from 'config/throttler.config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigurableThrottlerGuard } from '@shared/guards/configurable-throttler.guard';
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, envConfig, jwtConfig, mailConfig, throttlerConfig],
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const throttlerConfig = config.get<{ ttl: number; limit: number }>(
          'throttler.global',
        );
        return {
          throttlers: [
            {
              ttl: throttlerConfig!.ttl,
              limit: throttlerConfig!.limit,
            },
          ],
        };
      },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
  ],
  providers: [
    ConfigurableThrottlerGuard,
    {
      provide: APP_GUARD,
      useExisting: ConfigurableThrottlerGuard,
    },
  ],
})
export class AppModule {}
