import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard used exclusively on `POST /auth/refresh`.
 *
 * Validates the JWT refresh token extracted from the request body and
 * attaches its decoded payload to `request.user`.
 *
 * Unlike {@link JwtAuthGuard} this guard is applied per-endpoint and does
 * **not** support the `@Public()` bypass.
 *
 * @see {@link JwtRefreshStrategy}
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
