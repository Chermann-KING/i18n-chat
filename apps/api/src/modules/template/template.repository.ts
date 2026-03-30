import { Injectable } from '@nestjs/common';
import type {
  CreateTemplateData,
  CreateTemplateVariableData,
  FindTemplatesOptions,
  ITemplateRepository,
  PagedResult,
  RecipientField as DomainRecipientField,
  TemplateEntity,
  TemplateTranslationEntity,
  TemplateVariableEntity,
  UpdateTemplateData,
  UpdateWaTemplateStatusData,
  UpsertTranslationData,
  VariableSource as DomainVariableSource,
  VariableType as DomainVariableType,
  WaTemplateCategory as DomainWaCategory,
  WaTemplateStatus as DomainWaStatus,
} from '@i18n-chat/domain';
import type { Template, TemplateTranslation, TemplateVariable } from '@prisma/client';
import { RecipientField, VariableSource, VariableType, WaTemplateCategory, WaTemplateStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Default page size for template list queries. */
const DEFAULT_PAGE = 1;
/** Default number of results per page. */
const DEFAULT_LIMIT = 20;

/**
 * Prisma-backed implementation of {@link ITemplateRepository}.
 */
@Injectable()
export class TemplateRepository implements ITemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @inheritdoc */
  async findById(
    id: string,
    options: Pick<FindTemplatesOptions, 'includeTranslations' | 'includeVariables'> = {},
  ): Promise<TemplateEntity | null> {
    const row = await this.prisma.template.findUnique({
      where: { id },
      include: {
        variables: options.includeVariables ?? false,
        translations: options.includeTranslations ?? false,
      },
    });
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  async findBySlug(
    slug: string,
    options: Pick<FindTemplatesOptions, 'includeTranslations' | 'includeVariables'> = {},
  ): Promise<TemplateEntity | null> {
    const row = await this.prisma.template.findUnique({
      where: { slug },
      include: {
        variables: options.includeVariables ?? false,
        translations: options.includeTranslations ?? false,
      },
    });
    return row ? this.toEntity(row) : null;
  }

  /** @inheritdoc */
  async findAll(options: FindTemplatesOptions = {}): Promise<PagedResult<TemplateEntity>> {
    const page = options.page ?? DEFAULT_PAGE;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const where = {
      ...(options.category !== undefined ? { category: options.category } : {}),
      ...(options.isActive !== undefined ? { isActive: options.isActive } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variables: options.includeVariables ?? false,
          translations: options.includeTranslations ?? false,
        },
      }),
      this.prisma.template.count({ where }),
    ]);

    return { data: rows.map((r) => this.toEntity(r)), total };
  }

  /** @inheritdoc */
  async create(data: CreateTemplateData): Promise<TemplateEntity> {
    const row = await this.prisma.template.create({
      data: {
        name: data.name,
        slug: data.slug,
        category: data.category,
        fallbackLanguageCode: data.fallbackLanguageCode,
        createdById: data.createdById,
        variables: data.variables
          ? {
              create: data.variables.map((v) => ({
                key: v.key,
                label: v.label,
                type: v.type as unknown as VariableType,
                source: v.source as unknown as VariableSource,
                recipientField: v.recipientField as unknown as RecipientField | undefined,
                isRequired: v.isRequired,
                defaultValue: v.defaultValue,
              })),
            }
          : undefined,
      },
      include: { variables: true, translations: true },
    });
    return this.toEntity(row);
  }

  /** @inheritdoc */
  async update(id: string, data: UpdateTemplateData): Promise<TemplateEntity> {
    const row = await this.prisma.template.update({
      where: { id },
      data,
      include: { variables: true, translations: true },
    });
    return this.toEntity(row);
  }

  /** @inheritdoc */
  async delete(id: string): Promise<void> {
    await this.prisma.template.update({ where: { id }, data: { isActive: false } });
  }

  /** @inheritdoc */
  async findTranslation(
    templateId: string,
    languageCode: string,
  ): Promise<TemplateTranslationEntity | null> {
    const row = await this.prisma.templateTranslation.findUnique({
      where: { templateId_languageCode: { templateId, languageCode } },
    });
    return row ? this.toTranslationEntity(row) : null;
  }

  /** @inheritdoc */
  async upsertTranslation(
    templateId: string,
    data: UpsertTranslationData,
  ): Promise<TemplateTranslationEntity> {
    const row = await this.prisma.templateTranslation.upsert({
      where: { templateId_languageCode: { templateId, languageCode: data.languageCode } },
      create: {
        templateId,
        languageCode: data.languageCode,
        name: data.name,
        subject: data.subject,
        body: data.body,
        variableLabels: data.variableLabels ?? undefined,
        waTemplateName: data.waTemplateName,
        waTemplateCategory: data.waTemplateCategory as unknown as WaTemplateCategory | undefined,
      },
      update: {
        name: data.name,
        subject: data.subject,
        body: data.body,
        variableLabels: data.variableLabels ?? undefined,
        waTemplateName: data.waTemplateName,
        waTemplateCategory: data.waTemplateCategory as unknown as WaTemplateCategory | undefined,
      },
    });
    return this.toTranslationEntity(row);
  }

  /** @inheritdoc */
  async updateWaTemplateStatus(
    templateId: string,
    languageCode: string,
    data: UpdateWaTemplateStatusData,
  ): Promise<TemplateTranslationEntity> {
    const row = await this.prisma.templateTranslation.update({
      where: { templateId_languageCode: { templateId, languageCode } },
      data: {
        waTemplateStatus: data.waTemplateStatus as unknown as WaTemplateStatus,
        waTemplateMetaId: data.waTemplateMetaId,
      },
    });
    return this.toTranslationEntity(row);
  }

  /** @inheritdoc */
  async deleteTranslation(templateId: string, languageCode: string): Promise<void> {
    await this.prisma.templateTranslation.delete({
      where: { templateId_languageCode: { templateId, languageCode } },
    });
  }

  /** @inheritdoc */
  async addVariable(templateId: string, data: CreateTemplateVariableData): Promise<TemplateVariableEntity> {
    const row = await this.prisma.templateVariable.create({
      data: {
        templateId,
        key: data.key,
        label: data.label,
        type: data.type as unknown as VariableType,
        source: data.source as unknown as VariableSource,
        recipientField: data.recipientField as unknown as RecipientField | undefined,
        isRequired: data.isRequired,
        defaultValue: data.defaultValue,
      },
    });
    return {
      id: row.id,
      templateId: row.templateId,
      key: row.key,
      label: row.label,
      type: row.type as unknown as DomainVariableType,
      source: row.source as unknown as DomainVariableSource,
      recipientField: row.recipientField as unknown as DomainRecipientField | null,
      isRequired: row.isRequired,
      defaultValue: row.defaultValue,
    };
  }

  /** @inheritdoc */
  async deleteVariable(variableId: string): Promise<void> {
    await this.prisma.templateVariable.delete({ where: { id: variableId } });
  }

  /**
   * Maps a Prisma template row (with optional relations) to a domain {@link TemplateEntity}.
   */
  private toEntity(
    row: Template & { variables?: TemplateVariable[]; translations?: TemplateTranslation[] },
  ): TemplateEntity {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      category: row.category,
      fallbackLanguageCode: row.fallbackLanguageCode,
      createdById: row.createdById,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      variables: row.variables?.map((v) => ({
        id: v.id,
        templateId: v.templateId,
        key: v.key,
        label: v.label,
        type: v.type as unknown as DomainVariableType,
        source: v.source as unknown as DomainVariableSource,
        recipientField: v.recipientField as unknown as DomainRecipientField | null,
        isRequired: v.isRequired,
        defaultValue: v.defaultValue,
      })),
      translations: row.translations?.map((t) => this.toTranslationEntity(t)),
    };
  }

  /**
   * Maps a Prisma `TemplateTranslation` row to a domain {@link TemplateTranslationEntity}.
   *
   * Prisma WA enums are cast to domain equivalents — both share identical string values.
   */
  private toTranslationEntity(row: TemplateTranslation): TemplateTranslationEntity {
    return {
      id: row.id,
      templateId: row.templateId,
      languageCode: row.languageCode,
      name: row.name,
      subject: row.subject,
      body: row.body,
      variableLabels: row.variableLabels as Record<string, string> | null,
      waTemplateName: row.waTemplateName,
      waTemplateStatus: row.waTemplateStatus as unknown as DomainWaStatus,
      waTemplateCategory: row.waTemplateCategory as unknown as DomainWaCategory | null,
      waTemplateMetaId: row.waTemplateMetaId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
