import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { getPrismaPagination } from '@shared/infrastructure/repositories/search-params';
import { buildPrismaSearchQuery } from '@shared/infrastructure/repositories/prisma-search.helper';
import { Worksite } from '../../domain/entities/worksite.entity';
import { WorksiteCodeTakenException } from '../../domain/exceptions/worksite.exceptions';
import {
  WorksiteCostInputs,
  WorksiteRepositoryPort,
} from '../../domain/ports/worksite-repository.port';
import { WorksiteMapper } from '../mappers/worksite.mapper';

/**
 * The client's name travels with every worksite read. Through a relation
 * include, which the tenant extension does not filter — safe here because
 * `worksites.client_id` is only ever written after `isAssignableClient`.
 */
const WITH_CLIENT = { client: { select: { id: true, displayName: true } } };

@Injectable()
export class WorksiteRepository implements WorksiteRepositoryPort {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  async search(params: SearchParams): Promise<SearchResult<Worksite>> {
    const { skip, take, page } = getPrismaPagination(params);
    // No tenant clause here: the extension adds it to both queries below.
    const { where, orderBy } = buildPrismaSearchQuery(params, 'createdAt', {
      searchableFields: ['name', 'code'],
    });
    // The client is a relation now, so the generic helper cannot reach its
    // name: added to the same OR by hand, and sorted through the relation.
    const search = params.filters?.search;
    if (typeof search === 'string' && search !== '') {
      where.OR = [
        ...((where.OR as unknown[]) ?? []),
        { client: { displayName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const order =
      params.sort?.field === 'client' ? { client: { displayName: params.sort.order } } : orderBy;
    // Not optional: a soft-deleted worksite exists only to keep its hours and
    // receipts, and must never surface in a listing.
    const notDeleted = { ...where, deletedAt: null };

    const [rows, total] = await Promise.all([
      this.prisma.worksite.findMany({
        where: notDeleted,
        orderBy: order,
        skip,
        take,
        include: WITH_CLIENT,
      }),
      this.prisma.worksite.count({ where: notDeleted }),
    ]);

    return {
      items: rows.map((row) => WorksiteMapper.toDomain(row)),
      total,
      page,
      limit: take ?? total,
    };
  }

  async findById(id: string): Promise<Worksite | null> {
    // The same rule `search` follows: nobody reaches by id a worksite they
    // would never see in a list.
    const row = await this.prisma.worksite.findUnique({
      where: { id, deletedAt: null },
      include: WITH_CLIENT,
    });
    return row ? WorksiteMapper.toDomain(row) : null;
  }

  async save(worksite: Worksite): Promise<Worksite> {
    const data = WorksiteMapper.toPersistence(worksite);
    try {
      const row = await this.prisma.worksite.upsert({
        where: { id: worksite.id },
        create: data,
        update: data,
        include: WITH_CLIENT,
      });
      return WorksiteMapper.toDomain(row);
    } catch (error) {
      // The only unique index on the table besides the primary key is
      // `(organization_id, code)` — so a P2002 here always means the code.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new WorksiteCodeTakenException(worksite.code);
      }
      throw error;
    }
  }

  async isAssignableClient(clientId: string): Promise<boolean> {
    // Through the tenant-filtered client: another organization's id is not
    // found, exactly like a nonexistent one.
    const count = await this.prisma.client.count({ where: { id: clientId, deletedAt: null } });
    return count > 0;
  }

  async findCostInputs(worksiteId: string): Promise<WorksiteCostInputs> {
    const [timesheetRows, expenseRows] = await Promise.all([
      this.prisma.timesheet.findMany({
        where: { worksiteId },
        select: { hoursWorked: true, worker: { select: { hourlyRate: true } } },
      }),
      this.prisma.expense.findMany({
        where: { worksiteId },
        select: { amount: true },
      }),
    ]);

    return {
      timesheets: timesheetRows.map((t) => ({
        hoursWorked: t.hoursWorked.toNumber(),
        hourlyRate: t.worker.hourlyRate.toNumber(),
      })),
      expenses: expenseRows.map((e) => ({ amount: e.amount.toNumber() })),
    };
  }
}
