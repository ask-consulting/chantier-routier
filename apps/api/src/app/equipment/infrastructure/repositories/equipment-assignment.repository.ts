import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { buildPrismaSearchQuery } from '@shared/infrastructure/repositories/prisma-search.helper';
import { getPrismaPagination } from '@shared/infrastructure/repositories/search-params';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import {
  AssignmentWorksite,
  EquipmentAssignment,
} from '../../domain/entities/equipment-assignment.entity';
import { EquipmentAssignmentRepositoryPort } from '../../domain/ports/equipment-assignment-repository.port';
import { EquipmentMapper } from '../mappers/equipment.mapper';

/** The machine to price the period, the worksite to name it. */
const WITH_RELATIONS = {
  equipment: true,
  worksite: { select: { id: true, code: true, name: true } },
} satisfies Prisma.EquipmentAssignmentInclude;

type AssignmentRow = Prisma.EquipmentAssignmentGetPayload<{ include: typeof WITH_RELATIONS }>;

function day(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function date(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDomain(row: AssignmentRow): EquipmentAssignment {
  return EquipmentAssignment.create(
    {
      id: row.id,
      organizationId: row.organizationId,
      equipmentId: row.equipmentId,
      worksiteId: row.worksiteId,
      startDate: day(row.startDate),
      endDate: day(row.endDate),
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
    // Relations are read through `include`, which the tenant extension does
    // not filter — safe: both ids were checked against the caller's
    // organization before they were ever written.
    { equipment: EquipmentMapper.toDomain(row.equipment), worksite: row.worksite },
  );
}

@Injectable()
export class EquipmentAssignmentRepository implements EquipmentAssignmentRepositoryPort {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  async search(params: SearchParams): Promise<SearchResult<EquipmentAssignment>> {
    const { skip, take, page } = getPrismaPagination(params);
    const { where, orderBy } = buildPrismaSearchQuery(params, 'startDate', { searchableFields: [] });

    const [rows, total] = await Promise.all([
      this.prisma.equipmentAssignment.findMany({
        where,
        orderBy,
        skip,
        take,
        include: WITH_RELATIONS,
      }),
      this.prisma.equipmentAssignment.count({ where }),
    ]);

    return { items: rows.map(toDomain), total, page, limit: take ?? total };
  }

  async findById(id: string): Promise<EquipmentAssignment | null> {
    const row = await this.prisma.equipmentAssignment.findUnique({
      where: { id },
      include: WITH_RELATIONS,
    });
    return row ? toDomain(row) : null;
  }

  async save(assignment: EquipmentAssignment): Promise<EquipmentAssignment> {
    const data = {
      id: assignment.id,
      organizationId: assignment.organizationId,
      equipmentId: assignment.equipmentId,
      worksiteId: assignment.worksiteId,
      startDate: date(assignment.startDate),
      endDate: date(assignment.endDate),
      notes: assignment.notes,
    };
    const row = await this.prisma.equipmentAssignment.upsert({
      where: { id: assignment.id },
      create: data,
      update: data,
      include: WITH_RELATIONS,
    });
    return toDomain(row);
  }

  async delete(id: string): Promise<void> {
    // `deleteMany` rather than `delete`: the tenant filter joins the `where`,
    // and a foreign id then deletes nothing instead of throwing.
    await this.prisma.equipmentAssignment.deleteMany({ where: { id } });
  }

  async findOverlapping(
    equipmentId: string,
    period: { startDate: string; endDate: string },
    excludeId?: string,
  ): Promise<EquipmentAssignment[]> {
    // Two periods share a day when each starts before the other ends.
    const rows = await this.prisma.equipmentAssignment.findMany({
      where: {
        equipmentId,
        startDate: { lte: date(period.endDate) },
        endDate: { gte: date(period.startDate) },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { startDate: 'asc' },
      include: WITH_RELATIONS,
    });
    return rows.map(toDomain);
  }

  async countOutside(equipmentId: string, from: string, until: string | null): Promise<number> {
    return this.prisma.equipmentAssignment.count({
      where: {
        equipmentId,
        OR: [
          { startDate: { lt: date(from) } },
          ...(until ? [{ endDate: { gt: date(until) } }] : []),
        ],
      },
    });
  }

  async countEndingFrom(equipmentId: string, day: string): Promise<number> {
    return this.prisma.equipmentAssignment.count({
      where: { equipmentId, endDate: { gte: date(day) } },
    });
  }

  async findWorksite(worksiteId: string): Promise<AssignmentWorksite | null> {
    // Through the tenant filter: another organization's worksite, or a
    // deleted one, is not found.
    return this.prisma.worksite.findFirst({
      where: { id: worksiteId, deletedAt: null },
      select: { id: true, code: true, name: true },
    });
  }
}
