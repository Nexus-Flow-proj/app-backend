import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { ApiResponseInterceptor } from '@shared/interceptors/api-response.interceptor';
import { ApiExceptionFilter } from '@shared/filters/api-exception.filter';
import { SocketIoAdapter } from '@shared/adapters/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('env.port');
  const frontendUrl = configService.get<string>('env.frontendUrl');

  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-csrf-token'],
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.setGlobalPrefix('api');
  app.useWebSocketAdapter(new SocketIoAdapter(app));
  await app.listen(port ?? 3000);
}
void bootstrap();
