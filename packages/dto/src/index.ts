/**
 * @packageDocumentation
 * Shared Zod schemas and their inferred TypeScript types.
 * All schemas are defined here and imported by both `apps/api` and `apps/web`.
 *
 * Naming convention:
 * - Schema: `CreateDispatchSchema`
 * - Inferred type: `TCreateDispatch`
 */

// ─── Auth ──────────────────────────────────────────────────────────────────────
export { LoginSchema, RefreshTokenSchema, AuthTokensSchema } from './auth.schema';
export type { TLogin, TRefreshToken, TAuthTokens } from './auth.schema';

// ─── User ──────────────────────────────────────────────────────────────────────
export {
  CreateUserSchema,
  UpdateUserSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  UpdateNotificationsSchema,
  UserResponseSchema,
} from './user.schema';
export type {
  TCreateUser,
  TUpdateUser,
  TUpdateProfile,
  TChangePassword,
  TUpdateNotifications,
  TUserResponse,
} from './user.schema';

// ─── Language ──────────────────────────────────────────────────────────────────
export {
  CreateLanguageSchema,
  UpdateLanguageSchema,
  LanguageResponseSchema,
} from './language.schema';
export type { TCreateLanguage, TUpdateLanguage, TLanguageResponse } from './language.schema';

// ─── Recipient ─────────────────────────────────────────────────────────────────
export {
  CreateRecipientSchema,
  UpdateRecipientSchema,
  AddChannelSchema,
  RecipientChannelInputSchema,
  RecipientChannelResponseSchema,
  RecipientResponseSchema,
} from './recipient.schema';
export type {
  TCreateRecipient,
  TUpdateRecipient,
  TAddChannel,
  TRecipientResponse,
  TRecipientChannelResponse,
} from './recipient.schema';

// ─── Template ──────────────────────────────────────────────────────────────────
export {
  TemplateVariableSchema,
  TemplateVariableResponseSchema,
  AddVariableSchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  CreateTranslationSchema,
  UpdateTranslationSchema,
  TranslationResponseSchema,
  TemplateResponseSchema,
} from './template.schema';
export type {
  TAddVariable,
  TCreateTemplate,
  TUpdateTemplate,
  TCreateTranslation,
  TUpdateTranslation,
  TTemplateResponse,
  TTranslationResponse,
  TTemplateVariable,
} from './template.schema';

// ─── Dispatch ──────────────────────────────────────────────────────────────────
export {
  DispatchTargetSchema,
  CreateDispatchSchema,
  DispatchResponseSchema,
} from './dispatch.schema';
export type { TCreateDispatch, TDispatchTarget, TDispatchResponse } from './dispatch.schema';

// ─── Message ───────────────────────────────────────────────────────────────────
export { MessageResponseSchema, MessageListResponseSchema } from './message.schema';
export type { TMessageResponse, TMessageListResponse } from './message.schema';
