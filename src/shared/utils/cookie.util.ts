import { Response } from 'express';

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface CookieMaxAgeConfig {
  accessTokenCookieMaxAge: number;
  refreshTokenCookieMaxAge: number;
  csrfTokenCookieMaxAge: number;
}

export interface RequestCookies {
  access_token?: string;
  refresh_token?: string;
  csrf_token?: string;
}

function getCookieOptions(maxAge: number, path = '/') {
  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(
      process.env.FRONTEND_URL &&
        process.env.FRONTEND_URL.startsWith('https://'),
    );

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    maxAge,
    path,
  };
}

export function setAuthCookies(
  res: Response,
  tokens: TokenPayload,
  cookieMaxAgeConfig: CookieMaxAgeConfig,
): void {
  res.cookie(
    'access_token',
    tokens.accessToken,
    getCookieOptions(cookieMaxAgeConfig.accessTokenCookieMaxAge),
  );

  res.cookie(
    'refresh_token',
    tokens.refreshToken,
    getCookieOptions(
      cookieMaxAgeConfig.refreshTokenCookieMaxAge,
      '/api/auth',
    ),
  );

  res.cookie('csrf_token', tokens.csrfToken, {
    ...getCookieOptions(cookieMaxAgeConfig.csrfTokenCookieMaxAge),
    httpOnly: false,
  });
}

export function clearAuthCookies(res: Response): void {
  const isProd =
    process.env.NODE_ENV === 'production' ||
    Boolean(
      process.env.FRONTEND_URL &&
        process.env.FRONTEND_URL.startsWith('https://'),
    );
  const cookieOptions = {
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    path: '/',
  };

  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', { ...cookieOptions, path: '/api/auth' });
  res.clearCookie('csrf_token', cookieOptions);
}

export function parseCookie(cookieHeader: string): RequestCookies {
  return cookieHeader.split(';').reduce((cookies, part) => {
    const [key, ...valueParts] = part.trim().split('=');

    if (!key) return cookies;

    cookies[key as keyof RequestCookies] = decodeURIComponent(
      valueParts.join('='),
    );

    return cookies;
  }, {} as RequestCookies);
}