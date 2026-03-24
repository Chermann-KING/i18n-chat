import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PinoLoggerService } from './common/logger/pino-logger.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/**
 * Application bootstrap function.
 * Initialises the NestJS application, configures Swagger, and starts listening.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ─── Structured logger (Pino) ─────────────────────────────────────────────
  const logger = new PinoLoggerService();
  app.useLogger(logger);

  // ─── Global exception filter ──────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  app.setGlobalPrefix('api/v1');

  // ─── Swagger / OpenAPI ────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('i18n-chat API')
    .setDescription('Multilingual message dispatch platform — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
