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

function getCookieOptions(maxAge: number, path?: string) {
  const isProd = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    maxAge,
    ...(path ? { path } : {}),
  };
}

export function setAuthCookies(res: Response, tokens: TokenPayload): void {
  res.cookie(
    'access_token',
    tokens.accessToken,
    getCookieOptions(30 * 60 * 1000),
  );

  res.cookie(
    'refresh_token',
    tokens.refreshToken,
    getCookieOptions(7 * 24 * 60 * 60 * 1000, '/api/auth'),
  );

  res.cookie('csrf_token', tokens.csrfToken, {
    ...getCookieOptions(60 * 60 * 1000),
    httpOnly: false,
  });
}

export function clearAuthCookies(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
  };

  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', { ...cookieOptions, path: '/api/auth' });
  res.clearCookie('csrf_token', cookieOptions);
}
