import { Module } from '@nestjs/common';
import { TRANSLATION_PROVIDER } from '@i18n-chat/domain';
import { LibreTranslateService } from './libre-translate.service';
import { ModernMtService } from './modern-mt.service';

/**
 * Provides the active machine-translation adapter via the {@link TRANSLATION_PROVIDER} token.
 *
 * **Swap the provider** by changing `useClass` — no other module needs to change:
 * - `ModernMtService`  — ModernMT Cloud API (current)
 * - `LibreTranslateService` — self-hosted LibreTranslate (GDPR-first, 0 €)
 *
 * Both classes implement {@link ITranslationProvider} and are fully interchangeable.
 */
@Module({
  providers: [
    LibreTranslateService,
    ModernMtService,
    { provide: TRANSLATION_PROVIDER, useClass: ModernMtService },
  ],
  exports: [TRANSLATION_PROVIDER],
})
export class TranslationModule {}
