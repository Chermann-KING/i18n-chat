import { Injectable } from '@nestjs/common';
import {
  NotFoundException,
  type FindTemplatesOptions,
  type PagedResult,
  type TemplateEntity,
  type TemplateTranslationEntity,
} from '@i18n-chat/domain';
import type {
  TCreateTemplate,
  TCreateTranslation,
  TTemplateResponse,
  TTranslationResponse,
  TUpdateTemplate,
  TUpdateTranslation,
} from '@i18n-chat/dto';
import { TemplateRepository } from './template.repository';

/**
 * Business logic for template management.
 *
 * Handles CRUD for templates and their per-language translations.
 * Delegates persistence to {@link TemplateRepository}.
 */
@Injectable()
export class TemplateService {
  constructor(private readonly repository: TemplateRepository) {}

  /**
   * Returns a paginated list of templates.
   *
   * @param options - Optional filters (category, active state, pagination).
   */
  async findAll(options?: FindTemplatesOptions): Promise<PagedResult<TTemplateResponse>> {
    const result = await this.repository.findAll(options);
    return { data: result.data.map((t) => this.toResponse(t)), total: result.total };
  }

  /**
   * Returns a single template by UUID, with variables and translations.
   *
   * @param id - Template UUID.
   * @throws {NotFoundException} When no template with the given ID exists.
   */
  async findById(id: string): Promise<TTemplateResponse> {
    const template = await this.repository.findById(id, {
      includeVariables: true,
      includeTranslations: true,
    });
    if (!template) throw new NotFoundException('Template', id);
    return this.toResponse(template);
  }

  /**
   * Returns a single template by its slug, with variables and translations.
   *
   * @param slug - Unique machine-readable slug.
   * @throws {NotFoundException} When no template with the given slug exists.
   */
  async findBySlug(slug: string): Promise<TTemplateResponse> {
    const template = await this.repository.findBySlug(slug, {
      includeVariables: true,
      includeTranslations: true,
    });
    if (!template) throw new NotFoundException('Template', slug);
    return this.toResponse(template);
  }

  /**
   * Creates a new template with optional variable definitions.
   *
   * @param data - Validated creation payload.
   * @param createdById - UUID of the staff user creating the template.
   * @returns The persisted template with its variables.
   */
  async create(data: TCreateTemplate, createdById: string): Promise<TTemplateResponse> {
    const template = await this.repository.create({
      slug: data.slug,
      category: data.category,
      createdById,
      variables: data.variables?.map((v) => ({
        key: v.key,
        label: v.label,
        isRequired: v.isRequired,
        defaultValue: v.defaultValue,
      })),
    });
    return this.toResponse(template);
  }

  /**
   * Updates a template's category or active state.
   *
   * @param id - UUID of the template to update.
   * @param data - Validated update payload.
   * @throws {NotFoundException} When no template with the given ID exists.
   */
  async update(id: string, data: TUpdateTemplate): Promise<TTemplateResponse> {
    const exists = await this.repository.findById(id);
    if (!exists) throw new NotFoundException('Template', id);

    const template = await this.repository.update(id, data);
    return this.toResponse(template);
  }

  /**
   * Soft-deletes a template (sets `isActive = false`).
   *
   * @param id - UUID of the template to deactivate.
   * @throws {NotFoundException} When no template with the given ID exists.
   */
  async delete(id: string): Promise<void> {
    const exists = await this.repository.findById(id);
    if (!exists) throw new NotFoundException('Template', id);
    await this.repository.delete(id);
  }

  /**
   * Creates or updates a translation for a template in the given language.
   *
   * @param templateId - UUID of the parent template.
   * @param data - Validated translation payload.
   * @returns The resulting translation.
   * @throws {NotFoundException} When no template with the given ID exists.
   */
  async upsertTranslation(
    templateId: string,
    data: TCreateTranslation | (TUpdateTranslation & { languageCode: string }),
  ): Promise<TTranslationResponse> {
    const exists = await this.repository.findById(templateId);
    if (!exists) throw new NotFoundException('Template', templateId);

    const translation = await this.repository.upsertTranslation(templateId, {
      languageCode: (data as { languageCode: string }).languageCode,
      subject: data.subject,
      body: data.body ?? '',
      waTemplateName: data.waTemplateName,
      waTemplateCategory: data.waTemplateCategory,
    });
    return this.toTranslationResponse(translation);
  }

  /**
   * Removes a translation from a template.
   *
   * @param templateId - UUID of the parent template.
   * @param languageCode - ISO 639-1 code of the translation to remove.
   * @throws {NotFoundException} When the template or translation does not exist.
   */
  async deleteTranslation(templateId: string, languageCode: string): Promise<void> {
    const exists = await this.repository.findById(templateId);
    if (!exists) throw new NotFoundException('Template', templateId);

    const translation = await this.repository.findTranslation(templateId, languageCode);
    if (!translation) throw new NotFoundException('TemplateTranslation', languageCode);

    await this.repository.deleteTranslation(templateId, languageCode);
  }

  /**
   * Maps a domain {@link TemplateEntity} to the API response shape.
   */
  private toResponse(template: TemplateEntity): TTemplateResponse {
    return {
      id: template.id,
      slug: template.slug,
      category: template.category,
      isActive: template.isActive,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      variables: template.variables?.map((v) => ({
        id: v.id,
        key: v.key,
        label: v.label,
        isRequired: v.isRequired,
        defaultValue: v.defaultValue ?? undefined,
      })),
      translations: template.translations?.map((t) => this.toTranslationResponse(t)),
    };
  }

  /**
   * Maps a domain {@link TemplateTranslationEntity} to the API response shape.
   */
  private toTranslationResponse(translation: TemplateTranslationEntity): TTranslationResponse {
    return {
      id: translation.id,
      languageCode: translation.languageCode,
      subject: translation.subject ?? undefined,
      body: translation.body,
      waTemplateName: translation.waTemplateName ?? undefined,
      waTemplateStatus:
        translation.waTemplateStatus as unknown as TTranslationResponse['waTemplateStatus'],
      waTemplateCategory:
        translation.waTemplateCategory as unknown as TTranslationResponse['waTemplateCategory'],
      waTemplateMetaId: translation.waTemplateMetaId ?? undefined,
      createdAt: translation.createdAt.toISOString(),
      updatedAt: translation.updatedAt.toISOString(),
    };
  }
}
