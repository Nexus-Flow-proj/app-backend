import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { User } from '../users/entities/user.entity';
import { AuthService } from './services/auth.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthController } from './controllers/auth.controller';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MailModule } from '@shared/providers/mail/mail.module';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshToken, User, PasswordResetToken]),
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    GoogleStrategy,
  ],
  exports: [JwtModule, TypeOrmModule],
})
export class AuthModule {}
