import { Worker as PrismaWorker, Prisma } from '@prisma/client';
import { Worker } from '../../domain/entities/worker.entity';

export class WorkerMapper {
  static toDomain(row: PrismaWorker): Worker {
    return Worker.create({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      qualification: row.qualification,
      // Prisma hands back a Decimal; the domain works in numbers, and an hourly
      // rate at two decimals is nowhere near the precision that would hurt.
      hourlyRate: row.hourlyRate.toNumber(),
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPersistence(worker: Worker): Prisma.WorkerUncheckedCreateInput {
    return {
      id: worker.id,
      organizationId: worker.organizationId,
      name: worker.name,
      qualification: worker.qualification,
      hourlyRate: worker.hourlyRate,
      active: worker.active,
    };
  }
}
