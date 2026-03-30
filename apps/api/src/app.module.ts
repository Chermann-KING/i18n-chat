import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EncryptionModule } from './common/encryption/encryption.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { LanguageModule } from './modules/language/language.module';
import { UserModule } from './modules/user/user.module';
import { RecipientModule } from './modules/recipient/recipient.module';
import { TemplateModule } from './modules/template/template.module';
import { ChannelModule } from './modules/channel/channel.module';
import { TranslationModule } from './modules/translation/translation.module';

/**
 * Root application module.
 *
 * Global providers:
 * - {@link JwtAuthGuard} — protects every route by default; bypass with `@Public()`.
 * - {@link RolesGuard} — enforces `@Roles()` metadata when present.
 * - {@link ThrottlerGuard} — enforces rate limits defined by `ThrottlerModule`.
 * - {@link CorrelationIdInterceptor} — attaches a UUID to every request/response.
 *
 * Global modules:
 * - {@link PrismaModule} — makes `PrismaService` available everywhere.
 * - {@link AuditModule} — makes `AuditService` available everywhere.
 * - {@link EncryptionModule} — makes `EncryptionService` available everywhere.
 * - `ScheduleModule` — enables `@Cron()` decorators across the application.
 * - `ThrottlerModule` — global: 10 req / 60 s per IP.
 *   Login route overrides to 5 req / 15 min.
 *   NOTE: uses in-memory storage by default. Replace with
 *   `ThrottlerStorageRedisService` from `@nestjs-throttler-storage-redis`
 *   for multi-instance deployments.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    EncryptionModule,
    PrismaModule,
    AuditModule,
    AuthModule,
    DispatchModule,
    LanguageModule,
    UserModule,
    RecipientModule,
    TemplateModule,
    ChannelModule,
    TranslationModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },
  ],
})
export class AppModule {}
