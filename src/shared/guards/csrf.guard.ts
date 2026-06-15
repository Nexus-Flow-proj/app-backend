import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RequestCookies } from '@shared/utils/cookie.util';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const currentMethod = req.method ?? '';
    if (['GET', 'HEAD', 'OPTIONS'].includes(currentMethod)) {
      return true;
    }
    const cookies = req.cookies as RequestCookies;
    const csrf_token = cookies.csrf_token;
    const tokenFromHeader = req.headers['x-csrf-token'];

    if (!csrf_token || !tokenFromHeader || csrf_token !== tokenFromHeader) {
      throw new ForbiddenException('Invalid or missing CSRF token');
    }

    return true;
  }
}
