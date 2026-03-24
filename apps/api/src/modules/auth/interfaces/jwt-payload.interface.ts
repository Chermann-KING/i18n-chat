import type { UserRole } from '@prisma/client';

/**
 * Payload encoded in a JWT **access** token.
 *
 * Signed with `JWT_ACCESS_SECRET`; expires after 15 minutes.
 */
export interface JwtAccessPayload {
  /** Subject — the authenticated user's UUID. */
  readonly sub: string;
  readonly email: string;
  readonly role: UserRole;
  /** Issued-at timestamp (seconds, set by the JWT library). */
  readonly iat?: number;
  /** Expiration timestamp (seconds, set by the JWT library). */
  readonly exp?: number;
}

/**
 * Payload encoded in a JWT **refresh** token.
 *
 * Signed with `JWT_REFRESH_SECRET`; expires after 7 days.
 * The `jti` claim maps to a hashed entry in the `refresh_tokens` table.
 */
export interface JwtRefreshPayload {
  /** Subject — the authenticated user's UUID. */
  readonly sub: string;
  readonly iat?: number;
  readonly exp?: number;
}

/**
 * Shape of the user object attached to `request.user` after JWT validation.
 * Returned by {@link JwtStrategy.validate}.
 */
export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly isActive: boolean;
}
