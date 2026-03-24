import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Root application module.
 * Feature modules will be imported here as they are implemented (Phase 3+).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class AppModule {}
