import {
  Body,
  Ip,
  Res,
  Controller,
  Post,
  Get,
  UseGuards,
  Req,
  UnauthorizedException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { SignUpDto } from '../dtos/signup.dto';
import {
  clearAuthCookies,
  RequestCookies,
  setAuthCookies,
} from '@shared/utils/cookie.util';
import type { Response, Request } from 'express';
import { LoginDto } from '../dtos/login.dto';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { ForgetPasswordDto } from '../dtos/forget-password.dto';
import { ThrottleKey } from '@shared/decorators/throttle-key.decorator';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { GoogleAuthGuard } from '@shared/guards/google-auth.guard';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from '../../../config/env.config';
import { GoogleAuthResult } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieMaxAgeConfig() {
    return this.configService.get<EnvConfig>('env')!;
  }

  @Post('signup')
  @ThrottleKey('global')
  async signUp(
    @Body() dto: SignUpDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken, csrfToken } =
      await this.authService.signUp(dto, ip);

    setAuthCookies(res, { accessToken, refreshToken, csrfToken }, this.getCookieMaxAgeConfig());

    return {
      message: 'Account registered successfully.',
      data: { user },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ThrottleKey('global')
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken, csrfToken } =
      await this.authService.login(dto, ip);

    setAuthCookies(res, { accessToken, refreshToken, csrfToken }, this.getCookieMaxAgeConfig());

    return {
      message: 'Login successful.',
      data: { user },
    };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: User) {
    return {
      message: 'Current user fetched successfully.',
      data: { user: await this.authService.getMe(user.id) },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard, JwtAuthGuard)
  async logout(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as RequestCookies;
    const refreshToken = cookies.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    await this.authService.logout(user.id, refreshToken);
    clearAuthCookies(res);
    return {
      message: 'Logged out successfully.',
      data: { loggedOut: true },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @ThrottleKey('global')
  async refresh(
    @Req() req: Request,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as RequestCookies;
    const refreshToken = cookies.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const tokens = await this.authService.refresh(refreshToken, ip);
    setAuthCookies(res, tokens, this.getCookieMaxAgeConfig());
    return {
      message: 'Token refreshed successfully.',
      data: {},
    };
  }

  @Post('forget-password')
  @HttpCode(HttpStatus.OK)
  @ThrottleKey('global')
  async forgetPassword(@Body() dto: ForgetPasswordDto) {
    await this.authService.forgetPassword(dto.email);
    return {
      message: 'Password reset mail sent successfully.',
      data: { sent: true },
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return {
      message: 'Password reset successfully.',
      data: { reset: true },
    };
  }

  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {}

  @Get('google/signup')
  @UseGuards(GoogleAuthGuard)
  googleSignup(): void {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @CurrentUser() result: GoogleAuthResult,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('env.frontendUrl');

    if (!result.ok || !result.user) {
      const redirectPath =
        result.flow === 'signup' ? '/signup' : '/login';
      const errorMessage = encodeURIComponent(
        result.message ?? 'Google authentication failed.',
      );
      return res.redirect(
        `${frontendUrl}${redirectPath}?googleAuth=failed&message=${errorMessage}`,
      );
    }

    const { accessToken, refreshToken, csrfToken } =
      await this.authService.googleLogin(result.user, ip);

    setAuthCookies(res, { accessToken, refreshToken, csrfToken }, this.getCookieMaxAgeConfig());

    res.redirect(`${frontendUrl}/dashboard`);
  }
}
