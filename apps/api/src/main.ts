import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Application bootstrap function.
 * Initialises the NestJS application, configures Swagger, and starts listening.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Pino logger will be configured in Phase 7 (Observability)
    bufferLogs: true,
  });

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
