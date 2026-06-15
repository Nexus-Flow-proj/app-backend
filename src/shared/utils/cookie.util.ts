import { Response } from 'express';

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}
export interface RequestCookies {
  access_token?: string;
  refresh_token?: string;
  csrf_token?: string;
}
export function setAuthCookies(res: Response, tokens: TokenPayload): void {
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.cookie('csrf_token', tokens.csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth' });
  res.clearCookie('csrf_token');
}
