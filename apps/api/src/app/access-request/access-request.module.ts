import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { CreateAccessRequestHandler } from './application/commands/create-access-request.handler';
import accessRequestConfig from './config/access-request.config';
import { ACCESS_REQUEST_REPOSITORY_PORT } from './domain/ports/access-request-repository.port';
import { AccessRequestRepository } from './infrastructure/repositories/access-request.repository';
import { AccessRequestController } from './presentation/controllers/access-request.controller';

@Module({
  imports: [CqrsModule, PrismaModule, ConfigModule.forFeature(accessRequestConfig)],
  controllers: [AccessRequestController],
  providers: [
    CreateAccessRequestHandler,
    { provide: ACCESS_REQUEST_REPOSITORY_PORT, useClass: AccessRequestRepository },
  ],
})
export class AccessRequestModule {}
