import { Worksite as PrismaWorksite, Prisma } from '@prisma/client';
import { WorksiteStatus } from '@chantia/shared';
import { Worksite } from '../../domain/entities/worksite.entity';

/** A worksite row, with its client's summary when the query loaded it. */
export type WorksiteRow = PrismaWorksite & {
  client?: { id: string; displayName: string } | null;
};

export class WorksiteMapper {
  static toDomain(row: WorksiteRow): Worksite {
    return Worksite.create({
      id: row.id,
      organizationId: row.organizationId,
      code: row.code,
      name: row.name,
      clientId: row.clientId,
      client: row.client ? { id: row.client.id, displayName: row.client.displayName } : null,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      plannedStartDate: row.plannedStartDate,
      plannedEndDate: row.plannedEndDate,
      status: row.status as WorksiteStatus,
      totalBudget: row.totalBudget ? row.totalBudget.toNumber() : null,
      deletedAt: row.deletedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(worksite: Worksite): Prisma.WorksiteUncheckedCreateInput {
    return {
      id: worksite.id,
      organizationId: worksite.organizationId,
      code: worksite.code,
      name: worksite.name,
      clientId: worksite.clientId,
      address: worksite.address,
      latitude: worksite.latitude,
      longitude: worksite.longitude,
      plannedStartDate: worksite.plannedStartDate,
      plannedEndDate: worksite.plannedEndDate,
      status: worksite.status,
      totalBudget: worksite.totalBudget,
      deletedAt: worksite.deletedAt,
    };
  }
}
