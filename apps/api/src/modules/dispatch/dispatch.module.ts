import { Module } from '@nestjs/common';
import { RecipientModule } from '../recipient/recipient.module';
import { TemplateModule } from '../template/template.module';
import { TranslationModule } from '../translation/translation.module';
import { DispatchController } from './dispatch.controller';
import { DispatchRepository } from './dispatch.repository';
import { DispatchService } from './dispatch.service';
import { MessageController } from './message.controller';
import { PurgeAnonymousTargetsJob } from './purge-anonymous-targets.job';
import { QueueModule } from './queue.module';

/**
 * Orchestrates the full dispatch lifecycle: creation, message building,
 * queue publishing, and real-time delivery status via WebSockets.
 *
 * Depends on:
 * - {@link RecipientModule} — recipient and channel lookups.
 * - {@link TemplateModule} — template rendering and WhatsApp template metadata.
 * - {@link TranslationModule} — LibreTranslate free-text translation.
 * - {@link QueueModule} — BullMQ queues, workers, and the delivery gateway.
 */
@Module({
  imports: [RecipientModule, TemplateModule, TranslationModule, QueueModule],
  controllers: [DispatchController, MessageController],
  providers: [DispatchRepository, DispatchService, PurgeAnonymousTargetsJob],
})
export class DispatchModule {}
