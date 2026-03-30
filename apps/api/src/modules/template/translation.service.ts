import { Injectable } from '@nestjs/common';
import {
  AppException,
  FALLBACK_LANGUAGE_CODE,
  TemplateTranslationNotFoundException,
  VariableType,
} from '@i18n-chat/domain';
import type { TemplateVariableEntity } from '@i18n-chat/domain';
import * as Handlebars from 'handlebars';
import { TemplateRepository } from './template.repository';

/**
 * Resolves and renders template translations for message dispatch.
 *
 * Resolution order:
 * 1. Find the translation for the recipient's preferred language.
 * 2. If not found, fall back to `en` (as per {@link FALLBACK_LANGUAGE_CODE}).
 * 3. If still not found, throw {@link TemplateTranslationNotFoundException}.
 * 4. Compile the Handlebars body and substitute the provided variables.
 */
@Injectable()
export class TranslationService {
  constructor(private readonly repository: TemplateRepository) {}

  /**
   * Resolves a template translation and renders the final message body.
   *
   * @param templateId - UUID of the template to resolve.
   * @param languageCode - ISO 639-1 code of the desired language.
   * @param variables - Key-value map of template variable substitutions.
   * @returns The rendered message body string.
   * @throws {TemplateTranslationNotFoundException} When no translation exists for
   *   the requested language or the fallback (`en`).
   */
  async resolveBody(
    templateId: string,
    languageCode: string,
    variables: Record<string, string> = {},
    variableDefs: TemplateVariableEntity[] = [],
  ): Promise<string> {
    const { body } = await this.resolveTranslation(
      templateId,
      languageCode,
      variables,
      variableDefs,
    );
    return body;
  }

  /**
   * Resolves both the rendered body and the subject for a template translation.
   *
   * @param templateId - UUID of the template.
   * @param languageCode - ISO 639-1 code of the desired language.
   * @param variables - Key-value substitutions.
   * @param variableDefs - Variable definitions for date/time formatting.
   * @returns Object containing the rendered `body` and optional `subject`.
   */
  async resolveTranslation(
    templateId: string,
    languageCode: string,
    variables: Record<string, string> = {},
    variableDefs: TemplateVariableEntity[] = [],
  ): Promise<{ body: string; subject?: string }> {
    let translation = await this.repository.findTranslation(templateId, languageCode);

    if (!translation && languageCode !== FALLBACK_LANGUAGE_CODE) {
      translation = await this.repository.findTranslation(templateId, FALLBACK_LANGUAGE_CODE);
    }

    if (!translation) {
      throw new TemplateTranslationNotFoundException(templateId, languageCode);
    }

    const formatted = this.formatVariables(variables, variableDefs, languageCode);
    return {
      body: this.renderBody(translation.body, formatted),
      subject: translation.subject ? this.renderBody(translation.subject, formatted) : undefined,
    };
  }

  /**
   * Pre-processes variable values by formatting DATE and TIME types
   * according to the recipient's locale before Handlebars rendering.
   *
   * @param variables - Raw key-value pairs from the dispatch.
   * @param defs - Variable definitions carrying type information.
   * @param languageCode - ISO 639-1 locale used for formatting.
   * @returns A new map with formatted values.
   */
  private formatVariables(
    variables: Record<string, string>,
    defs: TemplateVariableEntity[],
    languageCode: string,
  ): Record<string, string> {
    if (defs.length === 0) return variables;

    return defs.reduce<Record<string, string>>(
      (acc, def) => {
        const raw = variables[def.key];
        if (!raw) return acc;

        if (def.type === VariableType.DATE) {
          const parsed = new Date(raw);
          if (!Number.isNaN(parsed.getTime())) {
            acc[def.key] = new Intl.DateTimeFormat(languageCode, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(parsed);
          }
        } else if (def.type === VariableType.TIME) {
          const parsed = new Date(`1970-01-01T${raw}`);
          if (!Number.isNaN(parsed.getTime())) {
            acc[def.key] = new Intl.DateTimeFormat(languageCode, {
              hour: '2-digit',
              minute: '2-digit',
            }).format(parsed);
          }
        }
        return acc;
      },
      { ...variables },
    );
  }

  /**
   * Compiles a Handlebars template string and substitutes the given variables.
   *
   * @param body - Raw Handlebars template body, e.g. `'Bonjour {{prenom}}'`.
   * @param variables - Key-value pairs used for substitution.
   * @returns The rendered string.
   */
  /**
   * Strips HTML tags from a string to prevent XSS injection via variable values.
   *
   * @param value - The raw variable value supplied by the staff member.
   * @returns The sanitized string with all HTML tags removed.
   */
  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, '');
  }

  renderBody(body: string, variables: Record<string, string>): string {
    const safe = Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, this.stripHtml(v)]),
    );
    try {
      const compiled = Handlebars.compile(body, { noEscape: true });
      return compiled(safe);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AppException(`Template rendering failed: ${message}`, 'TEMPLATE_RENDER_ERROR', {
        message,
      });
    }
  }
}
