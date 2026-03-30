import { z } from 'zod';
import {
  RecipientField,
  VariableSource,
  VariableType,
  WaTemplateCategory,
  WaTemplateStatus,
} from '@i18n-chat/domain';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Allowed pattern for template slugs: lowercase letters, digits, underscores. */
const SLUG_REGEX = /^[a-z0-9_]+$/;

/** Allowed pattern for Handlebars variable keys: lowercase letters, digits, underscores. Must start with a letter. */
const VARIABLE_KEY_REGEX = /^[a-z][a-z0-9_]*$/;

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

/** Schema for a single template variable placeholder. */
export const TemplateVariableSchema = z.object({
  /** Handlebars key used in the template body, e.g. `'prenom'`, `'date'`. */
  key: z
    .string()
    .regex(VARIABLE_KEY_REGEX, 'Key must contain only lowercase letters and underscores'),
  /** Human-readable label shown to the sender in the UI. */
  label: z.string().min(1).max(200),
  /** Input type determining the widget shown in the dispatch wizard. Defaults to `TEXT`. */
  type: z.nativeEnum(VariableType).default(VariableType.TEXT),
  /** Whether the value is typed by staff or auto-injected from the recipient profile. Defaults to `MANUAL`. */
  source: z.nativeEnum(VariableSource).default(VariableSource.MANUAL),
  /** When `source` is `RECIPIENT_FIELD`, the recipient profile field to map. */
  recipientField: z.nativeEnum(RecipientField).optional(),
  /** Whether the variable must be provided for every recipient. Defaults to `true`. */
  isRequired: z.boolean().default(true),
  /** Value used when no per-recipient value is supplied. */
  defaultValue: z.string().optional(),
});

/** Schema for a template variable in API responses (includes server-assigned ID). */
export const TemplateVariableResponseSchema = TemplateVariableSchema.extend({
  id: z.string().uuid(),
  source: z.nativeEnum(VariableSource),
  recipientField: z.nativeEnum(RecipientField).nullable().optional(),
});

/** Schema for creating or updating a template translation. */
export const CreateTranslationSchema = z.object({
  /** ISO 639-1 language code, e.g. `'fr'`, `'nl'`, `'en'`. */
  languageCode: z.string().min(2).max(10),
  /** Localized name of the template in this language. Falls back to the template-level name when absent. */
  name: z.string().max(200).optional(),
  /** Subject line used for email channel only. Ignored by SMS and WhatsApp. */
  subject: z.string().max(500).optional(),
  /** Handlebars body string, e.g. `'Bonjour {{prenom}}, votre RDV est le {{date}}.'` */
  body: z.string().min(1),
  /** Per-language labels for each variable key. Falls back to `TemplateVariable.label` when absent. */
  variableLabels: z.record(z.string(), z.string()).optional(),
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
  name: z.string().nullable().optional(),
  variableLabels: z.record(z.string(), z.string()).nullable().optional(),
  waTemplateStatus: z.nativeEnum(WaTemplateStatus),
  waTemplateMetaId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Schemas ──────────────────────────────────────────────────────────────────

/** Validation schema for creating a new template. */
export const CreateTemplateSchema = z.object({
  /** Human-readable display name, e.g. `'Rappel de rendez-vous'`. */
  name: z.string().min(1).max(200),
  /** Unique machine-readable identifier, e.g. `'appointment_reminder'`. */
  slug: z
    .string()
    .regex(SLUG_REGEX, 'Slug must contain only lowercase letters, digits, and underscores'),
  /** Organisational category, e.g. `'administrative'`, `'medical'`. Defaults to `'general'`. */
  category: z.string().min(1).max(100).default('general'),
  /** ISO 639-1 fallback language code. Defaults to `'en'`. */
  fallbackLanguageCode: z.string().min(2).max(10).default('en'),
  /** Variable placeholders declared in the template body. */
  variables: z.array(TemplateVariableSchema).optional(),
});

/** Validation schema for adding a variable to an existing template. */
export const AddVariableSchema = z.object({
  /** Handlebars key used in the template body, e.g. `'prenom'`, `'date'`. */
  key: z
    .string()
    .regex(VARIABLE_KEY_REGEX, 'Key must contain only lowercase letters and underscores'),
  /** Human-readable label shown in the dispatch wizard. */
  label: z.string().min(1).max(200),
  /** Input type determining the widget shown in the dispatch wizard. Defaults to `TEXT`. */
  type: z.nativeEnum(VariableType).default(VariableType.TEXT),
  /** Whether the value is typed by staff or auto-injected from the recipient profile. Defaults to `MANUAL`. */
  source: z.nativeEnum(VariableSource).default(VariableSource.MANUAL),
  /** When `source` is `RECIPIENT_FIELD`, the recipient profile field to map. */
  recipientField: z.nativeEnum(RecipientField).optional(),
  /** Whether the variable must be provided for every send. Defaults to `true`. */
  isRequired: z.boolean().default(true),
  /** Default value used when no per-recipient value is supplied. */
  defaultValue: z.string().optional(),
});

/** Validation schema for updating an existing template's metadata. */
export const UpdateTemplateSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

/** Schema for the template object returned by the API. */
export const TemplateResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  category: z.string(),
  fallbackLanguageCode: z.string(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  variables: z.array(TemplateVariableResponseSchema).optional(),
  translations: z.array(TranslationResponseSchema).optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

/** @see {@link AddVariableSchema} */
export type TAddVariable = z.infer<typeof AddVariableSchema>;

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
