import { Module } from '@nestjs/common';
import { RecipientController } from './recipient.controller';
import { RecipientRepository } from './recipient.repository';
import { RecipientService } from './recipient.service';

/**
 * Provides recipient CRUD, channel management, and CSV bulk import.
 *
 * `RecipientRepository` and `RecipientService` are exported so the
 * `DispatchModule` can query recipients without additional HTTP round-trips.
 */
@Module({
  controllers: [RecipientController],
  providers: [RecipientRepository, RecipientService],
  exports: [RecipientRepository, RecipientService],
})
export class RecipientModule {}
