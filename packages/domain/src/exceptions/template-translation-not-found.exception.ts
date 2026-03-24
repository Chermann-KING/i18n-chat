import { AppException } from './app.exception';

/**
 * Thrown when no translation exists for a given template + language combination,
 * including the English fallback (`en`).
 */
export class TemplateTranslationNotFoundException extends AppException {
  constructor(templateId: string, languageCode: string) {
    super(
      `No translation found for template "${templateId}" in language "${languageCode}" (fallback "en" also missing).`,
      'TEMPLATE_TRANSLATION_NOT_FOUND',
      { templateId, languageCode },
    );
  }
}
