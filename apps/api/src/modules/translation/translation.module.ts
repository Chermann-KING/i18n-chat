import { Module } from '@nestjs/common';
import { LibreTranslateService } from './libre-translate.service';

/**
 * Provides the machine-translation adapter backed by LibreTranslate.
 *
 * Exports {@link LibreTranslateService} so that the Dispatch module can
 * translate free-text messages into each recipient's preferred language.
 */
@Module({
  providers: [LibreTranslateService],
  exports: [LibreTranslateService],
})
export class TranslationModule {}
