import { z } from 'zod';
import { WaTemplateCategory, WaTemplateStatus } from '@i18n-chat/domain';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Allowed pattern for template slugs: lowercase letters, digits, underscores. */
const SLUG_REGEX = /^[a-z0-9_]+$/;

/** Allowed pattern for Handlebars variable keys: lowercase letters and underscores. */
const VARIABLE_KEY_REGEX = /^[a-z_]+$/;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

/** Schema for a single template variable placeholder. */
export const TemplateVariableSchema = z.object({
  /** Handlebars key used in the template body, e.g. `'prenom'`, `'date'`. */
  key: z
    .string()
    .regex(VARIABLE_KEY_REGEX, 'Key must contain only lowercase letters and underscores'),
  /** Human-readable label shown to the sender in the UI. */
  label: z.string().min(1).max(200),
  /** Whether the variable must be provided for every recipient. Defaults to `true`. */
  isRequired: z.boolean().default(true),
  /** Value used when no per-recipient value is supplied. */
  defaultValue: z.string().optional(),
});

/** Schema for a template variable in API responses (includes server-assigned ID). */
export const TemplateVariableResponseSchema = TemplateVariableSchema.extend({
  id: z.string().uuid(),
});

/** Schema for creating or updating a template translation. */
export const CreateTranslationSchema = z.object({
  /** ISO 639-1 language code, e.g. `'fr'`, `'nl'`, `'en'`. */
  languageCode: z.string().min(2).max(10),
  /** Subject line used for email channel only. Ignored by SMS and WhatsApp. */
  subject: z.string().max(500).optional(),
  /** Handlebars body string, e.g. `'Bonjour {{prenom}}, votre RDV est le {{date}}.'` */
  body: z.string().min(1),
  /** Meta-approved HSM template name for WhatsApp channel. */
  waTemplateName: z.string().optional(),
  /** WhatsApp template category required for Meta approval. */
  waTemplateCategory: z.nativeEnum(WaTemplateCategory).optional(),
});

/** Validation schema for updating an existing translation (all fields optional). */
export const UpdateTranslationSchema = CreateTranslationSchema.omit({
  languageCode: true,
}).partial();

/** Schema for a translation in API responses (includes server-managed WA fields). */
export const TranslationResponseSchema = CreateTranslationSchema.extend({
  id: z.string().uuid(),
  waTemplateStatus: z.nativeEnum(WaTemplateStatus),
  waTemplateMetaId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Validation schema for creating a new template. */
export const CreateTemplateSchema = z.object({
  /** Unique machine-readable identifier, e.g. `'appointment_reminder'`. */
  slug: z
    .string()
    .regex(SLUG_REGEX, 'Slug must contain only lowercase letters, digits, and underscores'),
  /** Organisational category, e.g. `'administrative'`, `'medical'`. */
  category: z.string().min(1).max(100),
  /** Variable placeholders declared in the template body. */
  variables: z.array(TemplateVariableSchema).optional(),
});

/** Validation schema for updating an existing template's metadata. */
export const UpdateTemplateSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

/** Schema for the template object returned by the API. */
export const TemplateResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  category: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  variables: z.array(TemplateVariableResponseSchema).optional(),
  translations: z.array(TranslationResponseSchema).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link CreateTemplateSchema} */
export type TCreateTemplate = z.infer<typeof CreateTemplateSchema>;

/** @see {@link UpdateTemplateSchema} */
export type TUpdateTemplate = z.infer<typeof UpdateTemplateSchema>;

/** @see {@link CreateTranslationSchema} */
export type TCreateTranslation = z.infer<typeof CreateTranslationSchema>;

/** @see {@link UpdateTranslationSchema} */
export type TUpdateTranslation = z.infer<typeof UpdateTranslationSchema>;

/** @see {@link TemplateResponseSchema} */
export type TTemplateResponse = z.infer<typeof TemplateResponseSchema>;

/** @see {@link TranslationResponseSchema} */
export type TTranslationResponse = z.infer<typeof TranslationResponseSchema>;

/** @see {@link TemplateVariableSchema} */
export type TTemplateVariable = z.infer<typeof TemplateVariableSchema>;
