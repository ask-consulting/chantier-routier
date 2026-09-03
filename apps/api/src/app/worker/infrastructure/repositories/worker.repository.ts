import { Inject, Injectable } from '@nestjs/common';
import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { buildPrismaSearchQuery } from '@shared/infrastructure/repositories/prisma-search.helper';
import { getPrismaPagination } from '@shared/infrastructure/repositories/search-params';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Worker } from '../../domain/entities/worker.entity';
import { WorkerRepositoryPort } from '../../domain/ports/worker-repository.port';
import { WorkerMapper } from '../mappers/worker.mapper';

@Injectable()
export class WorkerRepository implements WorkerRepositoryPort {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  async search(params: SearchParams): Promise<SearchResult<Worker>> {
    const { skip, take, page } = getPrismaPagination(params);
    // No tenant clause here: the extension adds it to both queries below.
    // Sorted by name rather than by creation: a payroll is read alphabetically,
    // and "who did we add last" is not a question anybody asks of it.
    const { where, orderBy } = buildPrismaSearchQuery(params, 'name', {
      searchableFields: ['name', 'qualification'],
    });

    const [rows, total] = await Promise.all([
      this.prisma.worker.findMany({ where, orderBy, skip, take }),
      this.prisma.worker.count({ where }),
    ]);

    return {
      items: rows.map((row) => WorkerMapper.toDomain(row)),
      total,
      page,
      limit: take ?? total,
    };
  }

  async findById(id: string): Promise<Worker | null> {
    const row = await this.prisma.worker.findUnique({ where: { id } });
    return row ? WorkerMapper.toDomain(row) : null;
  }

  async save(worker: Worker): Promise<Worker> {
    const data = WorkerMapper.toPersistence(worker);
    const row = await this.prisma.worker.upsert({
      where: { id: worker.id },
      create: data,
      update: data,
    });
    return WorkerMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.worker.delete({ where: { id } });
  }

  countTimesheets(workerId: string): Promise<number> {
    return this.prisma.timesheet.count({ where: { workerId } });
  }
}
