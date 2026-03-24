import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateRepository } from './template.repository';
import { TemplateService } from './template.service';
import { TranslationService } from './translation.service';

/**
 * Provides template CRUD, translation management, and Handlebars rendering.
 *
 * Exported services:
 * - {@link TemplateRepository} — used by `DispatchModule` for direct translation lookups.
 * - {@link TemplateService} — CRUD operations.
 * - {@link TranslationService} — resolves and renders translations for dispatch workers.
 */
@Module({
  controllers: [TemplateController],
  providers: [TemplateRepository, TemplateService, TranslationService],
  exports: [TemplateRepository, TemplateService, TranslationService],
})
export class TemplateModule {}
