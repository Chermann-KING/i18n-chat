import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that enforces role-based access control.
 *
 * Applied globally via `APP_GUARD` in {@link AppModule} **after**
 * {@link JwtAuthGuard}. Routes without a `@Roles()` decorator are accessible
 * to any authenticated user.
 *
 * @see {@link Roles}
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Allows access when:
   * - No `@Roles()` metadata is present (route is open to all authenticated users), or
   * - The authenticated user's role matches one of the required roles.
   *
   * @param context - The current execution context.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return requiredRoles.includes(user.role);
  }
}
