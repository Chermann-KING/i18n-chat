import { z } from 'zod';

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Validation schema for the login request body. */
export const LoginSchema = z.object({
  /** Staff member email address. */
  email: z.string().email(),
  /** Plain-text password — hashed server-side with argon2. */
  password: z.string().min(8).max(128),
});

/** Validation schema for a refresh-token rotation request. */
export const RefreshTokenSchema = z.object({
  /** The opaque refresh token issued at last login or rotation. */
  refreshToken: z.string().min(1),
});

/** Shape of the JWT token pair returned after a successful login or rotation. */
export const AuthTokensSchema = z.object({
  /** Short-lived access token (15 min). */
  accessToken: z.string(),
  /** Long-lived refresh token (7 days). Rotate on every use. */
  refreshToken: z.string(),
  /** Access token lifetime in seconds. */
  expiresIn: z.number().int().positive(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link LoginSchema} */
export type TLogin = z.infer<typeof LoginSchema>;

/** @see {@link RefreshTokenSchema} */
export type TRefreshToken = z.infer<typeof RefreshTokenSchema>;

/** @see {@link AuthTokensSchema} */
export type TAuthTokens = z.infer<typeof AuthTokensSchema>;
