import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { CreateWorkerHandler } from './application/commands/create-worker.handler';
import { DeleteWorkerHandler } from './application/commands/delete-worker.handler';
import { UpdateWorkerHandler } from './application/commands/update-worker.handler';
import { GetWorkerByIdHandler } from './application/queries/get-worker-by-id.handler';
import { GetWorkersHandler } from './application/queries/get-workers.handler';
import { WORKER_REPOSITORY_PORT } from './domain/ports/worker-repository.port';
import { WorkerRepository } from './infrastructure/repositories/worker.repository';
import { WorkerController } from './presentation/controllers/worker.controller';

const Handlers = [
  CreateWorkerHandler,
  UpdateWorkerHandler,
  DeleteWorkerHandler,
  GetWorkersHandler,
  GetWorkerByIdHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [WorkerController],
  providers: [
    ...Handlers,
    {
      provide: WORKER_REPOSITORY_PORT,
      useClass: WorkerRepository,
    },
  ],
})
export class WorkerModule {}
