import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * NestJS-aware Prisma client.
 *
 * Connects on module initialisation and gracefully disconnects when
 * the application shuts down. Registered as a global provider via
 * {@link PrismaModule} so every module can inject it without re-importing.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /** Opens the database connection when the NestJS application starts. */
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  /** Closes the database connection when the NestJS application shuts down. */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
