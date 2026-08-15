import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import {
  AuthService,
  GoogleAuthFlow,
  GoogleAuthResult,
} from '../services/auth.service';
import { GoogleUserDto } from '../dtos/google-user.dto';
import { Request } from 'express';

interface GooglePassportProfile {
  id: string;
  emails?: Array<{ value: string }>;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: GooglePassportProfile,
  ): Promise<GoogleAuthResult> {
    const { id, emails, name, photos } = profile;

    if (!emails || emails.length === 0) {
      throw new UnauthorizedException(
        'No email linked to this Google account.',
      );
    }

    const googleUser: GoogleUserDto = {
      googleId: id,
      email: emails[0].value,
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      avatarUrl: photos?.[0]?.value ?? null,
    };

    const flow = this.getGoogleFlow(req);

    if (!flow) {
      return {
        ok: false,
        flow: 'login',
        message: 'Invalid Google OAuth flow.',
      };
    }

    if (flow === 'login') {
      return this.authService.loginWithGoogle(googleUser);
    }

    return this.authService.signupWithGoogle(googleUser);
  }

  private getGoogleFlow(req: Request): GoogleAuthFlow | null {
    const state = req.query.state;
    const flow = Array.isArray(state) ? state[0] : state;

    if (flow !== 'login' && flow !== 'signup') {
      return null;
    }

    return flow;
  }
}
