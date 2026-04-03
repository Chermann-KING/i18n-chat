/**
 * NestJS injection token for the active {@link ITranslationProvider} implementation.
 *
 * Bind a concrete adapter in `TranslationModule`:
 * ```ts
 * { provide: TRANSLATION_PROVIDER, useClass: ModernMtService }
 * ```
 * Inject it in consumers:
 * ```ts
 * @Inject(TRANSLATION_PROVIDER) private readonly translator: ITranslationProvider
 * ```
 */
export const TRANSLATION_PROVIDER = Symbol('ITranslationProvider');

/**
 * Port interface for machine-translation providers.
 *
 * Current adapters: `LibreTranslateService`, `ModernMtService`.
 * Swap the active adapter by rebinding {@link TRANSLATION_PROVIDER} in `TranslationModule`.
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
