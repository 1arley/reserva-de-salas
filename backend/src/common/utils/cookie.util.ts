import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

function parseDurationMs(
  expiresIn: string | undefined,
  fallbackMs: number,
): number {
  if (!expiresIn) return fallbackMs;

  const match = /^(\d+)([smhd])$/.exec(expiresIn);
  if (!match) return fallbackMs;

  const value = parseInt(match[1] ?? '', 10);
  const unit = match[2];

  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  if (unit === 'd') return value * 24 * 60 * 60 * 1000;

  return fallbackMs;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  config: ConfigService,
) {
  const isProd = config.get('NODE_ENV') === 'production';
  const accessMaxAge = parseDurationMs(
    config.get('JWT_ACCESS_EXPIRES_IN'),
    15 * 60 * 1000,
  );
  const refreshMaxAge = parseDurationMs(
    config.get('JWT_REFRESH_EXPIRES_IN'),
    7 * 24 * 60 * 60 * 1000,
  );

  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: accessMaxAge,
    path: '/',
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: refreshMaxAge,
    path: '/',
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
}
