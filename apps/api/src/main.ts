import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { AppConfig } from '@config/app.config';
import { ValidationException } from '@shared/infrastructure/exceptions/validation.exception';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ routerOptions: { ignoreTrailingSlash: true } }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors): ValidationException => {
        const formatted = errors.map((err) => ({
          field: err.property,
          code: `form.errors.${err.property}.${Object.keys(err.constraints ?? {})[0] ?? 'invalid'}`,
          message: Object.values(err.constraints ?? {})[0] ?? 'Invalid value',
        }));
        return new ValidationException(formatted);
      },
    }),
  );

  app.enableShutdownHooks();

  const appConfig = app.get(ConfigService).getOrThrow<AppConfig>('app');

  const allowedOrigins = ['http://localhost:3000', ...appConfig.corsOrigins];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Chantia API')
    .setDescription('Road worksite management REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('/api', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(appConfig.port, '0.0.0.0');
}

void bootstrap();
