import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@i18n-chat/domain';
import type { TCreateLanguage, TLanguageResponse, TUpdateLanguage } from '@i18n-chat/dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * Business logic for language management.
 *
 * Languages are reference data used to drive translation and recipient preferences.
 * Create / update / delete are restricted to admins via {@link LanguageController}.
 */
@Injectable()
export class LanguageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Returns all languages, optionally including inactive ones.
   *
   * @param includeInactive - When `true`, returns deactivated languages as well.
   * Defaults to `false`.
   */
  async findAll(includeInactive = false): Promise<TLanguageResponse[]> {
    return this.prisma.language.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Returns a single language by its ISO 639-1 code.
   *
   * @param code - ISO 639-1 code, e.g. `'fr'`, `'nl'`.
   * @throws {NotFoundException} When no language with the given code exists.
   */
  async findByCode(code: string): Promise<TLanguageResponse> {
    const language = await this.prisma.language.findUnique({ where: { code } });
    if (!language) throw new NotFoundException('Language', code);
    return language;
  }

  /**
   * Creates a new language entry.
   *
   * @param data - Code and label for the new language.
   * @param actorId - UUID of the admin performing the action.
   * @returns The persisted language.
   */
  async create(data: TCreateLanguage, actorId: string): Promise<TLanguageResponse> {
    const language = await this.prisma.language.create({ data });

    await this.audit.log({
      userId: actorId,
      action: 'language.created',
      entityType: 'Language',
      entityId: language.code,
      metadata: { code: language.code, label: language.label },
    });

    return language;
  }

  /**
   * Updates the label or active state of an existing language.
   *
   * @param code - ISO code of the language to update.
   * @param data - Fields to update (all optional).
   * @param actorId - UUID of the admin performing the action.
   * @returns The updated language.
   * @throws {NotFoundException} When no language with the given code exists.
   */
  async update(code: string, data: TUpdateLanguage, actorId: string): Promise<TLanguageResponse> {
    await this.findByCode(code);
    const language = await this.prisma.language.update({ where: { code }, data });

    await this.audit.log({
      userId: actorId,
      action: 'language.updated',
      entityType: 'Language',
      entityId: code,
      metadata: { changedFields: Object.keys(data) },
    });

    return language;
  }

  /**
   * Permanently removes a language entry.
   *
   * @param code - ISO code of the language to delete.
   * @param actorId - UUID of the admin performing the action.
   * @throws {NotFoundException} When no language with the given code exists.
   */
  async delete(code: string, actorId: string): Promise<void> {
    await this.findByCode(code);
    await this.prisma.language.delete({ where: { code } });

    await this.audit.log({
      userId: actorId,
      action: 'language.deleted',
      entityType: 'Language',
      entityId: code,
    });
  }
}
