import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Global audit module — registers {@link AuditService} once and makes it
 * available in every feature module without explicit imports.
 *
 * `PrismaModule` is itself global, so `PrismaService` is injected into
 * `AuditService` automatically.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
