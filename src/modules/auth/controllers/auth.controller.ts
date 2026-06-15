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
import { SignUpDto } from '../dto/signup.dto';
import {
  clearAuthCookies,
  RequestCookies,
  setAuthCookies,
} from '@shared/utils/cookie.util';
import type { Response, Request } from 'express';
import { LoginDto } from '../dto/login.dto';
import { CurrentUser } from '@shared/decorators/current-user.decorator';
import { User } from '@modules/users/entities/user.entity';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { CsrfGuard } from '@shared/guards/csrf.guard';
import { ForgetPasswordDto } from '../dto/forget-password.dto';
import { ThrottleKey } from '@shared/decorators/throttle-key.decorator';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ThrottleKey('signup')
  async signUp(
    @Body() dto: SignUpDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken, csrfToken } =
      await this.authService.signUp(dto, ip);

    setAuthCookies(res, { accessToken, refreshToken, csrfToken });

    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ThrottleKey('login')
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken, csrfToken } =
      await this.authService.login(dto, ip);

    setAuthCookies(res, { accessToken, refreshToken, csrfToken });

    return { user };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CsrfGuard)
  @ThrottleKey('refresh')
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
    setAuthCookies(res, tokens);
  }

  @Post('forget-password')
  @HttpCode(HttpStatus.OK)
  @ThrottleKey('forgetPassword')
  async forgetPassword(@Body() dto: ForgetPasswordDto) {
    await this.authService.forgetPassword(dto.email);
    return {
      message: 'If this email is registered, a reset link has been sent.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successfully.' };
  }
}
