import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

/** Metadata key used by {@link RolesGuard} to read required roles. */
export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users with at least one of the specified roles.
 *
 * Must be combined with {@link JwtAuthGuard} (applied globally) and
 * {@link RolesGuard}.
 *
 * @param roles - One or more {@link UserRole} values allowed to access the route.
 *
 * @example
 * ```ts
 * @Roles(UserRole.ADMIN)
 * @Delete(':id')
 * remove(@Param('id') id: string) { ... }
 * ```
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
