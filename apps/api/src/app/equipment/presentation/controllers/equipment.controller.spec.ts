import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { AcquisitionMethod, EquipmentCategory, UserRole } from '@chantia/shared';
import { CreateEquipmentCommand } from '../../application/commands/create-equipment.command';
import { DeleteEquipmentCommand } from '../../application/commands/delete-equipment.command';
import { UpdateEquipmentCommand } from '../../application/commands/update-equipment.command';
import { GetEquipmentListQuery } from '../../application/queries/get-equipment-list.query';
import { Equipment } from '../../domain/entities/equipment.entity';
import { GetEquipmentListDto } from '../dto/get-equipment-list.dto';
import { EquipmentController } from './equipment.controller';

/**
 * The regression this file exists for, the worksite budget's again: a foreman
 * sees the fleet, never its money — not hidden in a column, absent from the
 * payload.
 */

const PRICE = 365_000;

const machine = Equipment.create({
  id: 'eq-1',
  organizationId: 'org-1',
  typeCode: 'crawler_excavator',
  designation: 'Pelle CAT 320',
  acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
  acquisitionDate: '2026-01-01',
  purchasePrice: PRICE,
});

function build() {
  const queryBus = {
    execute: vi.fn(async (query: unknown) =>
      query instanceof GetEquipmentListQuery
        ? { items: [machine], total: 1, page: 1, limit: 20 }
        : machine,
    ),
  };
  const commandBus = { execute: vi.fn(async () => machine) };
  return {
    queryBus,
    commandBus,
    controller: new EquipmentController(
      queryBus as unknown as QueryBus,
      commandBus as unknown as CommandBus,
    ),
  };
}

function onTheWire(dto: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(dto)) as Record<string, unknown>;
}

describe('EquipmentController — who sees money', () => {
  it('omits every money field for a foreman', async () => {
    const { controller } = build();

    const [item] = (await controller.findAll(UserRole.FOREMAN, new GetEquipmentListDto())).items;
    const wire = onTheWire(item);

    for (const field of [
      'purchasePrice',
      'residualValue',
      'usefulLifeMonths',
      'depreciationEndDate',
      'monthlyPayment',
      'buyoutValue',
      'dailyRate',
      'dailyCost',
      'netBookValue',
    ]) {
      expect(wire).not.toHaveProperty(field);
    }
    expect(JSON.stringify(item)).not.toContain(String(PRICE));
    expect(wire.designation).toBe('Pelle CAT 320');
  });

  it('gives a site manager the figures, computed for today', async () => {
    const { controller } = build();

    const item = await controller.findOne(UserRole.SITE_MANAGER, 'eq-1');

    expect(item.purchasePrice).toBe(PRICE);
    expect(item.depreciationEndDate).toBe('2030-12-31');
    expect(typeof item.dailyCost).toBe('number');
  });
});

describe('EquipmentController — requests', () => {
  it('turns a category into the type codes filed under it', async () => {
    const { controller, queryBus } = build();
    const dto = Object.assign(new GetEquipmentListDto(), {
      category: EquipmentCategory.COMPACTION,
      sortField: 'fleetNumber',
    });

    await controller.findAll(UserRole.ADMIN, dto);

    const query = queryBus.execute.mock.calls[0][0] as GetEquipmentListQuery;
    const { typeCode } = query.params.filters as { typeCode: { in: string[] } };
    expect(typeCode.in).toContain('tandem_roller');
    expect(typeCode.in).not.toContain('bulldozer');
    expect(query.params.sort).toEqual({ field: 'fleetNumber', order: 'asc' });
  });

  it('sends no category filter when none is asked', async () => {
    const { controller, queryBus } = build();

    await controller.findAll(UserRole.ADMIN, new GetEquipmentListDto());

    const query = queryBus.execute.mock.calls[0][0] as GetEquipmentListQuery;
    expect((query.params.filters as { typeCode?: unknown }).typeCode).toBeUndefined();
  });

  it('creates, updates and deletes through the right commands', async () => {
    const { controller, commandBus } = build();

    await controller.create('org-1', UserRole.ADMIN, {
      typeCode: 'bulldozer',
      designation: 'Bull D6',
      acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
      acquisitionDate: '2026-01-01',
      purchasePrice: 1,
    });
    await controller.update(UserRole.ADMIN, 'eq-1', { designation: 'Bull D6T' });
    await expect(controller.remove('eq-1')).resolves.toBeUndefined();

    const [create, update, remove] = commandBus.execute.mock.calls.map((call) => call[0]);
    expect(create).toBeInstanceOf(CreateEquipmentCommand);
    expect((create as CreateEquipmentCommand).organizationId).toBe('org-1');
    expect(update).toBeInstanceOf(UpdateEquipmentCommand);
    expect(remove).toBeInstanceOf(DeleteEquipmentCommand);
  });
});
