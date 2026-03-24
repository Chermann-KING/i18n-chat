import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard based on the JWT access token strategy.
 *
 * Applied to every route via `APP_GUARD` in {@link AppModule}.
 * Routes decorated with {@link Public} are excluded from the check.
 *
 * @see {@link JwtStrategy}
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Skips authentication for routes marked with `@Public()`.
   * Otherwise delegates to the standard `AuthGuard('jwt')` logic.
   *
   * @param context - The current execution context.
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
