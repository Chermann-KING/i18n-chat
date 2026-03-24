// ─── Enums ────────────────────────────────────────────────────────────────────
export { MessageChannel } from './enums/message-channel.enum';
export { UserRole } from './enums/user-role.enum';
export { DispatchStatus } from './enums/dispatch-status.enum';
export { MessageStatus } from './enums/message-status.enum';
export { RecipientMode } from './enums/recipient-mode.enum';
export { WaTemplateStatus } from './enums/wa-template-status.enum';
export { WaTemplateCategory } from './enums/wa-template-category.enum';

// ─── Exceptions ───────────────────────────────────────────────────────────────
export { AppException } from './exceptions/app.exception';
export { NotFoundException } from './exceptions/not-found.exception';
export { UnauthorizedException } from './exceptions/unauthorized.exception';
export { TemplateTranslationNotFoundException } from './exceptions/template-translation-not-found.exception';

// ─── Port Interfaces ──────────────────────────────────────────────────────────
export type { IMessageChannel, SendMessagePayload } from './ports/message-channel.interface';
export type { ITranslationProvider } from './ports/translation-provider.interface';

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  FALLBACK_LANGUAGE_CODE,
  ANONYMOUS_TARGET_TTL_DAYS,
  MAX_RECIPIENTS_PER_DISPATCH,
} from './constants';
