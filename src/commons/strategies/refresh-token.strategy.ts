import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { JwtPayload, JwtPayloadWithRefreshToken } from '../types';

/**
 * Refresh tokens travel in the JSON body as `refreshToken`, with the
 * Authorization header accepted as a fallback for non-browser clients.
 *
 * Cookies were dropped deliberately: the API and the web app are served from
 * different domains in production, which would require SameSite=None plus
 * Secure on both sides for no security gain over a token the frontend already
 * has to store somewhere.
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.body?.refreshToken ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: process.env.REFRESH_TOKEN_KEY!,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): JwtPayloadWithRefreshToken {
    const refreshToken =
      req.body?.refreshToken ??
      req.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    return { ...payload, refreshToken };
  }
}
