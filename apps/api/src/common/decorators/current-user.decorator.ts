import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';

/**
 * Parameter decorator that extracts the authenticated user from the
 * current HTTP request.
 *
 * The user object is set by {@link JwtStrategy} after a valid access token
 * is presented.
 *
 * @example
 * ```ts
 * @Get('me')
 * getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return request.user;
  },
);
