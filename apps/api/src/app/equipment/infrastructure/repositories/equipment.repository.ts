import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SearchParams, SearchResult } from '@shared/domain/search.types';
import { buildPrismaSearchQuery } from '@shared/infrastructure/repositories/prisma-search.helper';
import { getPrismaPagination } from '@shared/infrastructure/repositories/search-params';
import { TENANT_PRISMA, TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Equipment } from '../../domain/entities/equipment.entity';
import { FleetNumberTakenException } from '../../domain/exceptions/equipment.exceptions';
import { EquipmentRepositoryPort } from '../../domain/ports/equipment-repository.port';
import { EquipmentMapper } from '../mappers/equipment.mapper';

@Injectable()
export class EquipmentRepository implements EquipmentRepositoryPort {
  constructor(
    @Inject(TENANT_PRISMA)
    private readonly prisma: TenantPrismaClient,
  ) {}

  async search(params: SearchParams): Promise<SearchResult<Equipment>> {
    const { skip, take, page } = getPrismaPagination(params);
    // No tenant clause: the extension adds it. A fleet is read by name.
    const { where, orderBy } = buildPrismaSearchQuery(params, 'designation', {
      searchableFields: [
        'designation',
        'fleetNumber',
        'brand',
        'model',
        'serialNumber',
        'registrationNumber',
      ],
    });
    const notDeleted = { ...where, deletedAt: null };

    const [rows, total] = await Promise.all([
      this.prisma.equipment.findMany({ where: notDeleted, orderBy, skip, take }),
      this.prisma.equipment.count({ where: notDeleted }),
    ]);

    return {
      items: rows.map((row) => EquipmentMapper.toDomain(row)),
      total,
      page,
      limit: take ?? total,
    };
  }

  async findById(id: string): Promise<Equipment | null> {
    const row = await this.prisma.equipment.findUnique({ where: { id, deletedAt: null } });
    return row ? EquipmentMapper.toDomain(row) : null;
  }

  async save(equipment: Equipment): Promise<Equipment> {
    const data = EquipmentMapper.toPersistence(equipment);
    try {
      const row = await this.prisma.equipment.upsert({
        where: { id: equipment.id },
        create: data,
        update: data,
      });
      return EquipmentMapper.toDomain(row);
    } catch (error) {
      // The only unique index besides the primary key is the fleet number.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        equipment.fleetNumber
      ) {
        throw new FleetNumberTakenException(equipment.fleetNumber);
      }
      throw error;
    }
  }
}
