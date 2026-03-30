import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

/**
 * Global module that provides {@link EncryptionService} to the entire application.
 *
 * Marked `@Global()` so any module can inject `EncryptionService` without
 * explicitly importing `EncryptionModule`.
 */
@Global()
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EncryptionModule {}
