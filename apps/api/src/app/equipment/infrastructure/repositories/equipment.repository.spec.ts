import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { AcquisitionMethod } from '@chantia/shared';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { Equipment } from '../../domain/entities/equipment.entity';
import { FleetNumberTakenException } from '../../domain/exceptions/equipment.exceptions';
import { EquipmentRepository } from './equipment.repository';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'eq-1',
    organizationId: 'org-1',
    typeCode: 'crawler_excavator',
    designation: 'Pelle CAT 320',
    fleetNumber: 'PL-02',
    brand: null,
    model: null,
    serialNumber: null,
    registrationNumber: null,
    manufactureYear: 2022,
    status: 'in_service',
    acquisitionMethod: 'cash_purchase',
    // `@db.Date` comes back as midnight UTC.
    acquisitionDate: new Date('2026-01-01T00:00:00.000Z'),
    supplier: null,
    purchasePrice: new Prisma.Decimal('365000.000'),
    residualValue: null,
    usefulLifeMonths: 60,
    monthlyPayment: null,
    buyoutValue: null,
    dailyRate: null,
    contractEndDate: null,
    disposalDate: null,
    notes: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function setup(upsertError?: unknown) {
  const prisma = {
    equipment: {
      findMany: vi.fn(async () => [row()]),
      count: vi.fn(async () => 1),
      findUnique: vi.fn(async () => row()),
      upsert: vi.fn(async () => {
        if (upsertError) throw upsertError;
        return row();
      }),
    },
  };
  return {
    prisma,
    repository: new EquipmentRepository(prisma as unknown as TenantPrismaClient),
  };
}

const machine = Equipment.create({
  id: 'eq-1',
  organizationId: 'org-1',
  typeCode: 'crawler_excavator',
  designation: 'Pelle CAT 320',
  fleetNumber: 'PL-02',
  acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
  acquisitionDate: '2026-01-01',
  purchasePrice: 365_000,
});

describe('EquipmentRepository', () => {
  it('excludes soft-deleted rows from the list and its count, sorted by designation', async () => {
    const { repository, prisma } = setup();

    await repository.search({ filters: { typeCode: { in: ['bulldozer'] } } });

    const args = prisma.equipment.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
    };
    expect(args.where.deletedAt).toBeNull();
    expect(args.where.typeCode).toEqual({ in: ['bulldozer'] });
    expect(args.where.organizationId).toBeUndefined();
    expect(args.orderBy).toEqual({ designation: 'asc' });
    expect(
      (prisma.equipment.count.mock.calls[0][0] as { where: { deletedAt: null } }).where.deletedAt,
    ).toBeNull();
  });

  it('reads dates back as days and decimals as numbers', async () => {
    const { repository, prisma } = setup();

    const equipment = await repository.findById('eq-1');

    expect(equipment?.acquisitionDate).toBe('2026-01-01');
    expect(equipment?.purchasePrice).toBe(365_000);
    expect(prisma.equipment.findUnique).toHaveBeenCalledWith({
      where: { id: 'eq-1', deletedAt: null },
    });
  });

  it('answers null for an unknown id', async () => {
    const { repository, prisma } = setup();
    prisma.equipment.findUnique.mockResolvedValueOnce(null as never);

    expect(await repository.findById('nope')).toBeNull();
  });

  it('writes days as midnight UTC', async () => {
    const { repository, prisma } = setup();

    await repository.save(machine);

    const { create } = prisma.equipment.upsert.mock.calls[0][0] as {
      create: { acquisitionDate: Date };
    };
    expect(create.acquisitionDate.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('turns a unique violation into a fleet-number conflict', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    await expect(setup(duplicate).repository.save(machine)).rejects.toBeInstanceOf(
      FleetNumberTakenException,
    );
  });

  it('lets any other error through', async () => {
    const other = new Error('connection reset');

    await expect(setup(other).repository.save(machine)).rejects.toBe(other);
  });
});
