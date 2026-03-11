import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { loggerConfig } from './config/logger';
import { validateEnv } from './config/env';
import * as fs from 'fs';

async function bootstrap() {
  validateEnv();

  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }

  const app = await NestFactory.create(AppModule, {
    logger: loggerConfig,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Servidor rodando na porta ${port}`, 'Bootstrap');
  Logger.log(`📡 Webhook endpoint: POST /webhooks/nowpayments`, 'Bootstrap');
}

bootstrap();
