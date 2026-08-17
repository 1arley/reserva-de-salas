import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from '@/common/utils/cookie.util';

describe('cookie.util', () => {
  let res: { cookie: jest.Mock; clearCookie: jest.Mock };

  const makeConfig = (
    values: Record<string, string | undefined>,
  ): ConfigService =>
    ({
      get: jest.fn((key: string) => values[key]),
    }) as unknown as ConfigService;

  beforeEach(() => {
    res = { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as {
      cookie: jest.Mock;
      clearCookie: jest.Mock;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setAuthCookies', () => {
    it('should set both cookies as httpOnly with maxAge derived from config (dev: lax, not secure)', () => {
      const config = makeConfig({
        NODE_ENV: 'development',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      });

      setAuthCookies(
        res as unknown as Response,
        'access-token',
        'refresh-token',
        config,
      );

      expect(res.cookie).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith(ACCESS_COOKIE, 'access-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });
      expect(res.cookie).toHaveBeenCalledWith(REFRESH_COOKIE, 'refresh-token', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    });

    it('should set secure + none sameSite when NODE_ENV is production (cross-domain)', () => {
      const config = makeConfig({
        NODE_ENV: 'production',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      });

      setAuthCookies(
        res as unknown as Response,
        'access-token',
        'refresh-token',
        config,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        ACCESS_COOKIE,
        'access-token',
        expect.objectContaining({ secure: true, sameSite: 'none' }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'refresh-token',
        expect.objectContaining({ secure: true, sameSite: 'none' }),
      );
    });

    it('should use fallback maxAge when config values are missing', () => {
      const config = makeConfig({ NODE_ENV: 'test' });

      setAuthCookies(
        res as unknown as Response,
        'access-token',
        'refresh-token',
        config,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        ACCESS_COOKIE,
        'access-token',
        expect.objectContaining({ maxAge: 15 * 60 * 1000 }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'refresh-token',
        expect.objectContaining({ maxAge: 7 * 24 * 60 * 60 * 1000 }),
      );
    });

    it('should use fallback maxAge when config values are invalid formats', () => {
      const config = makeConfig({
        NODE_ENV: 'test',
        JWT_ACCESS_EXPIRES_IN: '15x',
        JWT_REFRESH_EXPIRES_IN: 'not-a-duration',
      });

      setAuthCookies(
        res as unknown as Response,
        'access-token',
        'refresh-token',
        config,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        ACCESS_COOKIE,
        'access-token',
        expect.objectContaining({ maxAge: 15 * 60 * 1000 }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'refresh-token',
        expect.objectContaining({ maxAge: 7 * 24 * 60 * 60 * 1000 }),
      );
    });

    it('should parse seconds/minutes/hours/days units', () => {
      const config = makeConfig({
        NODE_ENV: 'test',
        JWT_ACCESS_EXPIRES_IN: '30s',
        JWT_REFRESH_EXPIRES_IN: '2h',
      });

      setAuthCookies(
        res as unknown as Response,
        'access-token',
        'refresh-token',
        config,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        ACCESS_COOKIE,
        'access-token',
        expect.objectContaining({ maxAge: 30 * 1000 }),
      );
      expect(res.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE,
        'refresh-token',
        expect.objectContaining({ maxAge: 2 * 60 * 60 * 1000 }),
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear both cookies with path /', () => {
      clearAuthCookies(res as unknown as Response);

      expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_COOKIE, {
        path: '/',
      });
      expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_COOKIE, {
        path: '/',
      });
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
    });
  });
});
