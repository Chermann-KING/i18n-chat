import { z } from 'zod';

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Validation schema for creating a new language (admin only). */
export const CreateLanguageSchema = z.object({
  /** ISO 639-1 code, e.g. `'fr'`, `'nl'`, `'ar'`. Max 10 chars to allow regional codes. */
  code: z.string().min(2).max(10),
  /** Human-readable label shown in the UI, e.g. `'Français'`. */
  label: z.string().min(1).max(100),
});

/** Validation schema for updating a language (admin only). */
export const UpdateLanguageSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

/** Schema for the language object returned by the API. */
export const LanguageResponseSchema = z.object({
  code: z.string(),
  label: z.string(),
  isActive: z.boolean(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link CreateLanguageSchema} */
export type TCreateLanguage = z.infer<typeof CreateLanguageSchema>;

/** @see {@link UpdateLanguageSchema} */
export type TUpdateLanguage = z.infer<typeof UpdateLanguageSchema>;

/** @see {@link LanguageResponseSchema} */
export type TLanguageResponse = z.infer<typeof LanguageResponseSchema>;
