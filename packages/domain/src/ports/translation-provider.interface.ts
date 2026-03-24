/**
 * Port interface for machine-translation providers.
 *
 * The production implementation uses self-hosted LibreTranslate (0 €, GDPR-compliant).
 * A stub/mock implementation is used during testing.
 */
export interface ITranslationProvider {
  /**
   * Translates a plain-text string to the specified target language.
   *
   * @param text - The text to translate.
   * @param targetLanguageCode - ISO 639-1 code of the target language (e.g. `'fr'`, `'nl'`).
   * @param sourceLanguageCode - ISO 639-1 code of the source language.
   *                             Pass `'auto'` or omit to let the provider detect it.
   * @returns The translated text.
   * @throws {AppException} When translation fails or the language pair is unsupported.
   */
  translate(text: string, targetLanguageCode: string, sourceLanguageCode?: string): Promise<string>;
}
