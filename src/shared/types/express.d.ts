import 'express';
import { User } from '@modules/users/entities/user.entity';
import { RequestCookies } from '@shared/utils/cookie.util';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      cookies?: RequestCookies;
    }
  }
}

export {};
