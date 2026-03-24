import { Module } from '@nestjs/common';
import { LanguageController } from './language.controller';
import { LanguageService } from './language.service';

/**
 * Provides language reference-data CRUD.
 *
 * `LanguageService` is exported so other modules (e.g. `RecipientModule`,
 * `TemplateModule`) can validate language codes without additional HTTP calls.
 */
@Module({
  controllers: [LanguageController],
  providers: [LanguageService],
  exports: [LanguageService],
})
export class LanguageModule {}
