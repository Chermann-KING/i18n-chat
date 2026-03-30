import type { VariableSource, RecipientField } from '../enums/variable-source.enum';
import type { VariableType } from '../enums/variable-type.enum';
import type { WaTemplateCategory } from '../enums/wa-template-category.enum';
import type { WaTemplateStatus } from '../enums/wa-template-status.enum';
import type { PagedResult } from './paged-result.type';

// ─── Entity Shapes ────────────────────────────────────────────────────────────

/** Domain view of a template variable placeholder. */
export interface TemplateVariableEntity {
  readonly id: string;
  readonly templateId: string;
  /** Handlebars key, e.g. `'prenom'`, `'date'`. */
  readonly key: string;
  readonly label: string;
  readonly type: VariableType;
  /** Whether the value is typed by the staff (`MANUAL`) or auto-injected from the recipient profile (`RECIPIENT_FIELD`). */
  readonly source: VariableSource;
  /** When `source` is `RECIPIENT_FIELD`, the recipient profile field to map. */
  readonly recipientField: RecipientField | null;
  readonly isRequired: boolean;
  readonly defaultValue: string | null;
}

/** Domain view of a single-language template translation. */
export interface TemplateTranslationEntity {
  readonly id: string;
  readonly templateId: string;
  readonly languageCode: string;
  /** Localized name of the template in this language. Falls back to `TemplateEntity.name` when absent. */
  readonly name: string | null;
  readonly subject: string | null;
  readonly body: string;
  /** Per-language labels for each variable key, e.g. `{"date": "Datum van de afspraak"}`.
   *  Falls back to `TemplateVariableEntity.label` when absent. */
  readonly variableLabels: Record<string, string> | null;
  readonly waTemplateName: string | null;
  readonly waTemplateStatus: WaTemplateStatus;
  readonly waTemplateCategory: WaTemplateCategory | null;
  readonly waTemplateMetaId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Domain view of a message template. */
export interface TemplateEntity {
  readonly id: string;
  /** Human-readable display name, e.g. 'Rappel de rendez-vous'. */
  readonly name: string;
  readonly slug: string;
  readonly category: string;
  /** ISO 639-1 fallback language code used when no translation exists for the recipient's language. */
  readonly fallbackLanguageCode: string;
  readonly createdById: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly variables?: TemplateVariableEntity[];
  readonly translations?: TemplateTranslationEntity[];
}

// ─── Input Types ──────────────────────────────────────────────────────────────

/** Data for creating a variable when creating a template. */
export interface CreateTemplateVariableData {
  readonly key: string;
  readonly label: string;
  readonly type: VariableType;
  readonly source: VariableSource;
  readonly recipientField?: RecipientField;
  readonly isRequired: boolean;
  readonly defaultValue?: string;
}

/** Data required to create a new template. */
export interface CreateTemplateData {
  readonly name: string;
  readonly slug: string;
  readonly category: string;
  readonly fallbackLanguageCode: string;
  readonly createdById: string;
  readonly variables?: CreateTemplateVariableData[];
}

/** Partial data allowed when updating a template. */
export interface UpdateTemplateData {
  readonly category?: string;
  readonly isActive?: boolean;
}

/** Data required to create or update a template translation. */
export interface UpsertTranslationData {
  readonly languageCode: string;
  /** Localized name of the template in this language. Optional. */
  readonly name?: string;
  readonly subject?: string;
  readonly body: string;
  /** Per-language labels for each variable key. Optional — falls back to `TemplateVariable.label`. */
  readonly variableLabels?: Record<string, string>;
  readonly waTemplateName?: string;
  readonly waTemplateCategory?: WaTemplateCategory;
}

/** Data for updating WhatsApp template approval status from Meta webhook. */
export interface UpdateWaTemplateStatusData {
  readonly waTemplateStatus: WaTemplateStatus;
  readonly waTemplateMetaId?: string;
}

/** Filtering and pagination options for template list queries. */
export interface FindTemplatesOptions {
  readonly category?: string;
  readonly isActive?: boolean;
  readonly includeTranslations?: boolean;
  readonly includeVariables?: boolean;
  readonly page?: number;
  readonly limit?: number;
}

// ─── Interface ────────────────────────────────────────────────────────────────

/**
 * Port interface for template persistence operations.
 *
 * Implementations live in `apps/api` and use Prisma.
 * Services depend on this interface — never on the concrete class.
 */
export interface ITemplateRepository {
  /**
   * Finds a single template by its UUID.
   *
   * @param id - Template UUID.
   * @param options - Whether to include relations.
   * @returns The template entity, or `null` if not found.
   */
  findById(
    id: string,
    options?: Pick<FindTemplatesOptions, 'includeTranslations' | 'includeVariables'>,
  ): Promise<TemplateEntity | null>;

  /**
   * Finds a single template by its machine-readable slug.
   *
   * @param slug - Unique slug, e.g. `'appointment_reminder'`.
   * @param options - Whether to include relations.
   * @returns The template entity, or `null` if not found.
   */
  findBySlug(
    slug: string,
    options?: Pick<FindTemplatesOptions, 'includeTranslations' | 'includeVariables'>,
  ): Promise<TemplateEntity | null>;

  /**
   * Returns a paginated list of templates matching the given filters.
   *
   * @param options - Optional filters and pagination parameters.
   */
  findAll(options?: FindTemplatesOptions): Promise<PagedResult<TemplateEntity>>;

  /**
   * Persists a new template with its variables.
   *
   * @param data - Fields required to create the template.
   * @returns The newly created template entity.
   */
  create(data: CreateTemplateData): Promise<TemplateEntity>;

  /**
   * Updates an existing template's metadata.
   *
   * @param id - UUID of the template to update.
   * @param data - Fields to update (partial).
   * @returns The updated template entity.
   */
  update(id: string, data: UpdateTemplateData): Promise<TemplateEntity>;

  /**
   * Soft-deletes a template (sets `isActive = false`).
   *
   * @param id - UUID of the template to deactivate.
   */
  delete(id: string): Promise<void>;

  /**
   * Returns a single translation for a template in the given language.
   *
   * @param templateId - Template UUID.
   * @param languageCode - ISO 639-1 code.
   * @returns The translation entity, or `null` if not found.
   */
  findTranslation(
    templateId: string,
    languageCode: string,
  ): Promise<TemplateTranslationEntity | null>;

  /**
   * Creates or updates a template translation.
   *
   * @param templateId - Template UUID.
   * @param data - Translation data to upsert.
   * @returns The resulting translation entity.
   */
  upsertTranslation(
    templateId: string,
    data: UpsertTranslationData,
  ): Promise<TemplateTranslationEntity>;

  /**
   * Updates the WhatsApp approval status of a translation.
   *
   * @param templateId - Template UUID.
   * @param languageCode - ISO 639-1 code.
   * @param data - New approval status and optional Meta template ID.
   */
  updateWaTemplateStatus(
    templateId: string,
    languageCode: string,
    data: UpdateWaTemplateStatusData,
  ): Promise<TemplateTranslationEntity>;

  /**
   * Removes a translation from a template.
   *
   * @param templateId - Template UUID.
   * @param languageCode - ISO 639-1 code.
   */
  deleteTranslation(templateId: string, languageCode: string): Promise<void>;

  /**
   * Adds a variable placeholder to an existing template.
   *
   * @param templateId - Template UUID.
   * @param data - Variable definition.
   * @returns The newly created variable entity.
   */
  addVariable(
    templateId: string,
    data: CreateTemplateVariableData,
  ): Promise<TemplateVariableEntity>;

  /**
   * Removes a variable from a template by its UUID.
   *
   * @param variableId - UUID of the variable to remove.
   */
  deleteVariable(variableId: string): Promise<void>;
}
