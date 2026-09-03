import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Worker } from '../../domain/entities/worker.entity';
import {
  WORKER_REPOSITORY_PORT,
  WorkerRepositoryPort,
} from '../../domain/ports/worker-repository.port';
import { GetWorkerByIdQuery } from './get-worker-by-id.query';

@QueryHandler(GetWorkerByIdQuery)
export class GetWorkerByIdHandler implements IQueryHandler<GetWorkerByIdQuery> {
  constructor(
    @Inject(WORKER_REPOSITORY_PORT)
    private readonly repository: WorkerRepositoryPort,
  ) {}

  async execute(query: GetWorkerByIdQuery): Promise<Worker> {
    const worker = await this.repository.findById(query.workerId);
    if (!worker) {
      // Another tenant's row lands here too: not found, never forbidden.
      throw new ResourceNotFoundException('Worker', query.workerId);
    }
    return worker;
  }
}
