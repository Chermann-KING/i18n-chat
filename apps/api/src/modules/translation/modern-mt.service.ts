import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '@i18n-chat/domain';
import type { ITranslationProvider } from '@i18n-chat/domain';

/** Root URL for the ModernMT public API. */
const MODERNMT_BASE_URL = 'https://api.modernmt.com';

/** Shape of a successful ModernMT `/translate` response. */
interface ModernMtTranslateData {
  translation: string;
}

/** Envelope wrapping every ModernMT API response. */
interface ModernMtResponse {
  status: number;
  data?: ModernMtTranslateData;
  error?: { type: string; message: string };
}

/**
 * Machine-translation provider backed by the ModernMT Cloud API.
 *
 * Implements {@link ITranslationProvider}.
 * Requires the `MODERNMT_API_KEY` environment variable.
 *
 * @see https://www.modernmt.com/api#translate
 *
 * @example
 * ```ts
 * const translated = await service.translate('Bonjour', 'nl', 'fr');
 * // → 'Hallo'
 * ```
 */
@Injectable()
export class ModernMtService implements ITranslationProvider {
  constructor(private readonly config: ConfigService) {}

  /**
   * Translates a plain-text string to the specified target language.
   *
   * @param text - The source text to translate.
   * @param targetLanguageCode - ISO 639-1 code of the target language (e.g. `'nl'`).
   * @param sourceLanguageCode - ISO 639-1 code of the source language.
   *                             Omit to let ModernMT auto-detect.
   * @returns The translated text.
   * @throws {AppException} When the HTTP request fails or ModernMT returns an error.
   */
  async translate(
    text: string,
    targetLanguageCode: string,
    sourceLanguageCode?: string,
  ): Promise<string> {
    const response = await this.fetchTranslation(text, targetLanguageCode, sourceLanguageCode);
    return this.extractTranslation(response, targetLanguageCode);
  }

  /** Calls the ModernMT `/translate` endpoint and returns the raw response envelope. */
  private async fetchTranslation(
    text: string,
    target: string,
    source?: string,
  ): Promise<ModernMtResponse> {
    const apiKey = this.config.getOrThrow<string>('MODERNMT_API_KEY');
    const url = this.buildTranslateUrl(text, target, source);

    const res = await fetch(url, {
      headers: { 'MMT-ApiKey': apiKey },
    });

    if (!res.ok) {
      throw new AppException(`ModernMT HTTP error: ${res.status}`, 'MODERNMT_HTTP_ERROR', {
        target,
      });
    }

    return res.json() as Promise<ModernMtResponse>;
  }

  /** Builds the `/translate` URL with query parameters. */
  private buildTranslateUrl(text: string, target: string, source?: string): string {
    const params = new URLSearchParams({ q: text, target });
    if (source) params.set('source', source);
    return `${MODERNMT_BASE_URL}/translate?${params.toString()}`;
  }

  /** Extracts the translated text from the response envelope, or throws on API-level error. */
  private extractTranslation(response: ModernMtResponse, target: string): string {
    if (response.error) {
      throw new AppException(
        `ModernMT error: ${response.error.message}`,
        'MODERNMT_TRANSLATE_FAILED',
        { target, errorType: response.error.type },
      );
    }
    return response.data?.translation ?? '';
  }
}
