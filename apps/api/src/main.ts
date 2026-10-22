import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('HealthSyncBootstrap');
  const app = await NestFactory.create(AppModule);

  // Increase payload limit to 25MB for multimodal prescription/report uploads
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  // Parse cookies for secure HTTP-only session auth
  app.use(cookieParser());

  // Enable CORS for frontend web client
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, Cookie',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('HealthSync Interoperability API')
    .setDescription(
      'Enterprise REST API documentation for HealthSync: Unified Digital Healthcare, Consent-Based Medical Record Sharing, AI Assistant, and Cryptographic Trust Layer.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('healthsync_session')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`====================================================`);
  logger.log(`🚀 HealthSync API Server running on http://localhost:${port}`);
  logger.log(`📚 OpenAPI / Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`====================================================`);
}

bootstrap();
