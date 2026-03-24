import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@i18n-chat/domain';
import type { ITranslationProvider } from '@i18n-chat/domain';

/** Expected JSON response from the LibreTranslate `/translate` endpoint. */
interface LibreTranslateResponse {
  translatedText?: string;
  error?: string;
}

/**
 * Machine-translation provider backed by a self-hosted LibreTranslate instance.
 *
 * Implements {@link ITranslationProvider}.
 * Requires `LIBRETRANSLATE_URL` environment variable pointing to the service root.
 *
 * @example
 * ```ts
 * const translated = await service.translate('Bonjour', 'nl', 'fr');
 * // → 'Hallo'
 * ```
 */
@Injectable()
export class LibreTranslateService implements ITranslationProvider {
  constructor(private readonly config: ConfigService) {}

  /**
   * Translates a plain-text string to the specified target language.
   *
   * @param text - The source text to translate.
   * @param targetLanguageCode - ISO 639-1 code of the target language (e.g. `'nl'`).
   * @param sourceLanguageCode - ISO 639-1 code of the source language.
   *                             Defaults to `'auto'` (provider auto-detection).
   * @returns The translated text.
   * @throws {AppException} When the HTTP request fails or LibreTranslate returns an error.
   */
  async translate(
    text: string,
    targetLanguageCode: string,
    sourceLanguageCode = 'auto',
  ): Promise<string> {
    const response = await this.postTranslateRequest(text, targetLanguageCode, sourceLanguageCode);
    return this.extractTranslation(response, targetLanguageCode);
  }

  /** POSTs the translation request to LibreTranslate. */
  private async postTranslateRequest(
    text: string,
    target: string,
    source: string,
  ): Promise<LibreTranslateResponse> {
    const baseUrl = this.config.getOrThrow<string>('LIBRETRANSLATE_URL');
    const url = `${baseUrl}/translate`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' }),
    });

    if (!res.ok) {
      throw new AppException(
        `LibreTranslate HTTP error: ${res.status}`,
        'LIBRETRANSLATE_HTTP_ERROR',
        { target },
      );
    }

    return res.json() as Promise<LibreTranslateResponse>;
  }

  /** Extracts the translated text from the response, or throws on error. */
  private extractTranslation(response: LibreTranslateResponse, target: string): string {
    if (response.error) {
      throw new AppException(
        `LibreTranslate error: ${response.error}`,
        'LIBRETRANSLATE_TRANSLATE_FAILED',
        { target },
      );
    }
    return response.translatedText ?? '';
  }
}
