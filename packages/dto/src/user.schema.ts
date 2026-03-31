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
  /** Agent's first name — used to personalise the welcome email. */
  firstName: z.string().min(1).max(100).optional(),
  /** Agent's last name — used to personalise the welcome email. */
  lastName: z.string().min(1).max(100).optional(),
});

/** Validation schema for updating an existing staff user (admin only). */
export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).optional(),
  role: z.nativeEnum(UserRole).optional(),
  preferredLanguageCode: z.string().min(2).max(10).optional(),
  isActive: z.boolean().optional(),
});

/** Schema for updating the authenticated user's own profile. */
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  preferredLanguageCode: z.string().min(2).max(10).optional(),
});

/**
 * Password strength rules (enforced both client-side for UX and server-side for security).
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character
 */
export const PASSWORD_RULES = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .regex(/[A-Z]/, 'At least one uppercase letter required')
  .regex(/[0-9]/, 'At least one digit required')
  .regex(/[^A-Za-z0-9]/, 'At least one special character required');

/** Schema for changing the authenticated user's password. */
export const ChangePasswordSchema = z.object({
  /** The user's current password (used to verify identity). */
  currentPassword: z.string().min(1),
  /** The new password to set. Must satisfy {@link PASSWORD_RULES}. */
  newPassword: PASSWORD_RULES,
});

/** Schema for updating the authenticated user's notification preferences. */
export const UpdateNotificationsSchema = z.object({
  /** When true, the user receives an email when one of their dispatches fails. */
  notifyOnFailure: z.boolean(),
});

/** Schema for the user object returned by the API (no password hash). */
export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  role: z.nativeEnum(UserRole),
  preferredLanguageCode: z.string(),
  notifyOnFailure: z.boolean(),
  mustChangePassword: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link CreateUserSchema} */
export type TCreateUser = z.infer<typeof CreateUserSchema>;

/** @see {@link UpdateUserSchema} */
export type TUpdateUser = z.infer<typeof UpdateUserSchema>;

/** @see {@link UpdateProfileSchema} */
export type TUpdateProfile = z.infer<typeof UpdateProfileSchema>;

/** @see {@link ChangePasswordSchema} */
export type TChangePassword = z.infer<typeof ChangePasswordSchema>;

/** @see {@link UpdateNotificationsSchema} */
export type TUpdateNotifications = z.infer<typeof UpdateNotificationsSchema>;

/** @see {@link UserResponseSchema} */
export type TUserResponse = z.infer<typeof UserResponseSchema>;
