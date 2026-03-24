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
  readonly isRequired: boolean;
  readonly defaultValue: string | null;
}

/** Domain view of a single-language template translation. */
export interface TemplateTranslationEntity {
  readonly id: string;
  readonly templateId: string;
  readonly languageCode: string;
  readonly subject: string | null;
  readonly body: string;
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
  readonly slug: string;
  readonly category: string;
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
  readonly isRequired: boolean;
  readonly defaultValue?: string;
}

/** Data required to create a new template. */
export interface CreateTemplateData {
  readonly slug: string;
  readonly category: string;
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
  readonly subject?: string;
  readonly body: string;
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
}
