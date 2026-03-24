import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtRefreshPayload } from '../interfaces/jwt-payload.interface';

/**
 * Passport strategy for validating JWT **refresh** tokens.
 *
 * Extracts the token from the `refreshToken` field of the request body,
 * verifies the signature against `JWT_REFRESH_SECRET`, and returns the
 * decoded payload.
 *
 * The actual database check (revocation, expiry) is performed inside
 * {@link AuthService.refreshTokens} — this strategy only ensures the
 * token is a well-formed, non-tampered JWT.
 *
 * Registers under the name `'jwt-refresh'`, used by {@link JwtRefreshGuard}.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
    });
  }

  /**
   * Called by Passport after the refresh token signature is verified.
   *
   * Returns the payload as-is; the controller delegates full validation
   * (revocation check, rotation) to {@link AuthService.refreshTokens}.
   *
   * @param payload - Decoded JWT refresh payload.
   */
  validate(payload: JwtRefreshPayload): JwtRefreshPayload {
    return payload;
  }
}
