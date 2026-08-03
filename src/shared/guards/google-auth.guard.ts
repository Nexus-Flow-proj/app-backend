import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const callbackURL = `${req.protocol}://${req.get('host')}/api/auth/google/callback`;

    if (req.path.includes('/google/signup')) {
      return { state: 'signup', callbackURL };
    }

    if (req.path.includes('/google/login')) {
      return { state: 'login', callbackURL };
    }

    return { callbackURL };
  }
}
