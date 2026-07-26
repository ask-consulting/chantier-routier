import { Worksite as PrismaWorksite, Prisma } from '@prisma/client';
import { WorksiteStatus } from '@chantier/shared';
import { Worksite } from '../../domain/entities/worksite.entity';

export class WorksiteMapper {
  static toDomain(row: PrismaWorksite): Worksite {
    return Worksite.create({
      id: row.id,
      organizationId: row.organizationId,
      code: row.code,
      name: row.name,
      client: row.client,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      plannedStartDate: row.plannedStartDate,
      plannedEndDate: row.plannedEndDate,
      status: row.status as WorksiteStatus,
      totalBudget: row.totalBudget ? row.totalBudget.toNumber() : null,
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
      client: worksite.client,
      address: worksite.address,
      latitude: worksite.latitude,
      longitude: worksite.longitude,
      plannedStartDate: worksite.plannedStartDate,
      plannedEndDate: worksite.plannedEndDate,
      status: worksite.status,
      totalBudget: worksite.totalBudget,
    };
  }
}
