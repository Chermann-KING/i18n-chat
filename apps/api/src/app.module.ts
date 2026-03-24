import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
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
 *
 * Global modules:
 * - {@link PrismaModule} — makes `PrismaService` available everywhere.
 * - `ScheduleModule` — enables `@Cron()` decorators across the application.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
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
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
