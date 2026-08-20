import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { AppConfig } from '@config/app.config';
import { DomainExceptionFilter } from '@shared/presentation/domain-exception.filter';
import { ValidationException } from '@shared/presentation/exceptions/validation.exception';

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

  // Business errors are plain `Error`s (see `shared/domain/domain.exception.ts`);
  // this is the single place that turns them into HTTP. Registered after the
  // pipe so the order reads the way a request flows.
  app.useGlobalFilters(new DomainExceptionFilter());

  app.enableShutdownHooks();

  const appConfig = app.get(ConfigService).getOrThrow<AppConfig>('app');

  const allowedOrigins = ['http://localhost:3000', ...appConfig.corsOrigins];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
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
