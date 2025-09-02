// src/main.ts
import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaSerializeInterceptor } from './common/prisma-serialize.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new PrismaSerializeInterceptor());


  // CORS for Flutter Web (dev) + room for prod via env
  // In dev you can allow any localhost port; in prod, set CORS_ORIGINS to a CSV.
  const corsOrigins = (process.env.CORS_ORIGINS ?? '').split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins.length > 0
      ? corsOrigins
      : [/^http:\/\/(localhost|127\.0\.0\.1):\d+$/], // dev default
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,   // set to false if you don't use cookies/credentials
    maxAge: 600,         // cache preflight 10 min
  });

  // Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0', () => console.log(`Listening on ${port}`))
}
bootstrap();