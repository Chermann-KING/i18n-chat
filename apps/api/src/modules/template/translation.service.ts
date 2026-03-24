import { Injectable } from '@nestjs/common';
import { FALLBACK_LANGUAGE_CODE, TemplateTranslationNotFoundException } from '@i18n-chat/domain';
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
  ): Promise<string> {
    let translation = await this.repository.findTranslation(templateId, languageCode);

    if (!translation && languageCode !== FALLBACK_LANGUAGE_CODE) {
      translation = await this.repository.findTranslation(templateId, FALLBACK_LANGUAGE_CODE);
    }

    if (!translation) {
      throw new TemplateTranslationNotFoundException(templateId, languageCode);
    }

    return this.renderBody(translation.body, variables);
  }

  /**
   * Compiles a Handlebars template string and substitutes the given variables.
   *
   * @param body - Raw Handlebars template body, e.g. `'Bonjour {{prenom}}'`.
   * @param variables - Key-value pairs used for substitution.
   * @returns The rendered string.
   */
  renderBody(body: string, variables: Record<string, string>): string {
    const compiled = Handlebars.compile(body, { noEscape: true });
    return compiled(variables);
  }
}
