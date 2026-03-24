import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global module that provides {@link PrismaService} to the entire application.
 *
 * Marked `@Global()` so feature modules do not need to import this module
 * explicitly — they can inject `PrismaService` directly.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
