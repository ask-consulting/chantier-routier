import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { AcquisitionMethod } from '@chantia/shared';
import { TenantPrismaClient } from '@shared/prisma/tenant-prisma.client';
import { EquipmentAssignment } from '../../domain/entities/equipment-assignment.entity';
import { EquipmentAssignmentRepository } from './equipment-assignment.repository';

const midnight = (day: string) => new Date(`${day}T00:00:00.000Z`);

function row() {
  return {
    id: 'as-1',
    organizationId: 'org-1',
    equipmentId: 'eq-1',
    worksiteId: 'ws-1',
    startDate: midnight('2026-04-01'),
    endDate: midnight('2026-04-10'),
    pricing: { acquisitionMethod: 'short_term_rental', acquisitionDate: '2026-03-01', dailyRate: 450 },
    cost: new Prisma.Decimal('4500.000'),
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    worksite: { id: 'ws-1', code: 'RN1', name: 'Réfection RN1' },
    equipment: {
      id: 'eq-1',
      organizationId: 'org-1',
      typeCode: 'tandem_roller',
      designation: 'Compacteur HAMM',
      fleetNumber: null,
      brand: null,
      model: null,
      serialNumber: null,
      registrationNumber: null,
      manufactureYear: null,
      status: 'in_service',
      acquisitionMethod: 'short_term_rental',
      acquisitionDate: midnight('2026-03-01'),
      supplier: null,
      purchasePrice: null,
      residualValue: null,
      usefulLifeMonths: null,
      monthlyPayment: null,
      buyoutValue: null,
      dailyRate: new Prisma.Decimal('450'),
      contractEndDate: null,
      disposalDate: null,
      notes: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

function setup() {
  const prisma = {
    equipmentAssignment: {
      findMany: vi.fn(async () => [row()]),
      count: vi.fn(async () => 3),
      findUnique: vi.fn(async () => row()),
      upsert: vi.fn(async () => row()),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    worksite: { findFirst: vi.fn(async () => ({ id: 'ws-1', code: 'RN1', name: 'Réfection RN1' })) },
  };
  return {
    prisma,
    repository: new EquipmentAssignmentRepository(prisma as unknown as TenantPrismaClient),
  };
}

describe('EquipmentAssignmentRepository', () => {
  it('lists chronologically, with the stored cost and the worksite named', async () => {
    const { repository, prisma } = setup();

    const result = await repository.search({ filters: { equipmentId: 'eq-1' } });

    const args = prisma.equipmentAssignment.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
      orderBy: unknown;
    };
    expect(args.where).toEqual({ equipmentId: 'eq-1' });
    expect(args.orderBy).toEqual({ startDate: 'asc' });
    expect(result.items[0].cost).toBe(4_500);
    expect(result.items[0].worksite?.code).toBe('RN1');
  });

  it('finds the overlap as "each starts before the other ends", excluding itself', async () => {
    const { repository, prisma } = setup();

    await repository.findOverlapping('eq-1', { startDate: '2026-04-05', endDate: '2026-04-20' }, 'as-9');

    const { where } = prisma.equipmentAssignment.findMany.mock.calls[0][0] as {
      where: Record<string, unknown>;
    };
    expect(where).toEqual({
      equipmentId: 'eq-1',
      startDate: { lte: midnight('2026-04-20') },
      endDate: { gte: midnight('2026-04-05') },
      id: { not: 'as-9' },
    });
  });

  it('counts what reaches outside a window, open-ended or not', async () => {
    const { repository, prisma } = setup();

    await repository.countOutside('eq-1', '2026-03-01', null);
    await repository.countOutside('eq-1', '2026-03-01', '2026-12-31');

    const [open, closed] = prisma.equipmentAssignment.count.mock.calls.map(
      (call) => (call[0] as { where: { OR: unknown[] } }).where.OR,
    );
    expect(open).toHaveLength(1);
    expect(closed).toContainEqual({ endDate: { gt: midnight('2026-12-31') } });
  });

  it('counts what ends from a day on', async () => {
    const { repository, prisma } = setup();

    expect(await repository.countEndingFrom('eq-1', '2026-09-28')).toBe(3);
    expect(prisma.equipmentAssignment.count).toHaveBeenCalledWith({
      where: { equipmentId: 'eq-1', endDate: { gte: midnight('2026-09-28') } },
    });
  });

  it('writes days as midnight UTC, and deletes through the tenant filter', async () => {
    const { repository, prisma } = setup();
    const pricing = {
      acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
      acquisitionDate: '2026-03-01',
      dailyRate: 450,
    };
    const assignment = EquipmentAssignment.create({
      id: 'as-1',
      organizationId: 'org-1',
      equipmentId: 'eq-1',
      worksiteId: 'ws-1',
      startDate: '2026-04-01',
      endDate: '2026-04-10',
      pricing,
    });

    await repository.save(assignment);
    await repository.delete('as-1');

    const { create } = prisma.equipmentAssignment.upsert.mock.calls[0][0] as {
      create: { startDate: Date; pricing: unknown; cost: number };
    };
    expect(create.startDate).toEqual(midnight('2026-04-01'));
    expect(create.pricing).toEqual(pricing);
    expect(create.cost).toBe(4_500);
    expect(prisma.equipmentAssignment.deleteMany).toHaveBeenCalledWith({ where: { id: 'as-1' } });
  });

  it('reads one, and looks a worksite up among current ones only', async () => {
    const { repository, prisma } = setup();

    expect((await repository.findById('as-1'))?.days).toBe(10);
    await repository.findWorksite('ws-1');
    expect(prisma.worksite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ws-1', deletedAt: null } }),
    );
    prisma.equipmentAssignment.findUnique.mockResolvedValueOnce(null as never);
    expect(await repository.findById('nope')).toBeNull();
  });
});
