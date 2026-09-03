import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { SearchResult } from '@shared/domain/search.types';
import { Worker } from '../../domain/entities/worker.entity';
import {
  WORKER_REPOSITORY_PORT,
  WorkerRepositoryPort,
} from '../../domain/ports/worker-repository.port';
import { GetWorkersQuery } from './get-workers.query';

@QueryHandler(GetWorkersQuery)
export class GetWorkersHandler implements IQueryHandler<GetWorkersQuery> {
  constructor(
    @Inject(WORKER_REPOSITORY_PORT)
    private readonly repository: WorkerRepositoryPort,
  ) {}

  execute(query: GetWorkersQuery): Promise<SearchResult<Worker>> {
    return this.repository.search(query.params);
  }
}
