import { z } from 'zod';
import { UserRole } from '@i18n-chat/domain';

// ─── Constants ────────────────────────────────────────────────────────────────

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Validation schema for creating a new staff user (admin only). */
export const CreateUserSchema = z.object({
  /** Must be a valid RFC 5322 email address. */
  email: z.string().email(),
  /** Plain-text password — hashed server-side with argon2. */
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
  /** Defaults to `SENDER` when omitted. */
  role: z.nativeEnum(UserRole).optional(),
  /** ISO 639-1 code, e.g. `'fr'`. Defaults to `'fr'` when omitted. */
  preferredLanguageCode: z.string().min(2).max(10).optional(),
});

/** Validation schema for updating an existing staff user. */
export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).optional(),
  role: z.nativeEnum(UserRole).optional(),
  preferredLanguageCode: z.string().min(2).max(10).optional(),
  isActive: z.boolean().optional(),
});

/** Schema for the user object returned by the API (no password hash). */
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  preferredLanguageCode: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link CreateUserSchema} */
export type TCreateUser = z.infer<typeof CreateUserSchema>;

/** @see {@link UpdateUserSchema} */
export type TUpdateUser = z.infer<typeof UpdateUserSchema>;

/** @see {@link UserResponseSchema} */
export type TUserResponse = z.infer<typeof UserResponseSchema>;
