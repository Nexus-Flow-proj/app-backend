import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.path.includes('/google/signup')) {
      return { state: 'signup' };
    }

    if (req.path.includes('/google/login')) {
      return { state: 'login' };
    }

    return {};
  }
}
