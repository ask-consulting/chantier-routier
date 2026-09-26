import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { AcquisitionMethod, UserRole } from '@chantia/shared';
import { CreateEquipmentAssignmentCommand } from '../../application/commands/create-equipment-assignment.command';
import { DeleteEquipmentAssignmentCommand } from '../../application/commands/delete-equipment-assignment.command';
import { UpdateEquipmentAssignmentCommand } from '../../application/commands/update-equipment-assignment.command';
import { GetEquipmentAssignmentsQuery } from '../../application/queries/get-equipment-assignments.query';
import { EquipmentAssignment } from '../../domain/entities/equipment-assignment.entity';
import { Equipment } from '../../domain/entities/equipment.entity';
import { GetEquipmentAssignmentsDto } from '../dto/equipment-assignment.dto';
import { EquipmentAssignmentController } from './equipment-assignment.controller';
import { EquipmentCatalogController } from './equipment-catalog.controller';

const assignment = EquipmentAssignment.create(
  {
    id: 'as-1',
    organizationId: 'org-1',
    equipmentId: 'eq-1',
    worksiteId: 'ws-1',
    startDate: '2026-04-01',
    endDate: '2026-04-10',
  },
  {
    equipment: Equipment.create({
      id: 'eq-1',
      organizationId: 'org-1',
      typeCode: 'tandem_roller',
      designation: 'Compacteur HAMM',
      fleetNumber: 'CP-03',
      acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
      acquisitionDate: '2026-03-01',
      dailyRate: 450,
    }),
    worksite: { id: 'ws-1', code: 'RN1', name: 'Réfection RN1' },
  },
);

function build() {
  const queryBus = {
    execute: vi.fn(async (query: unknown) =>
      query instanceof GetEquipmentAssignmentsQuery
        ? { items: [assignment], total: 1, page: 1, limit: 20 }
        : [],
    ),
  };
  const commandBus = { execute: vi.fn(async () => assignment) };
  return {
    queryBus,
    commandBus,
    controller: new EquipmentAssignmentController(
      queryBus as unknown as QueryBus,
      commandBus as unknown as CommandBus,
    ),
  };
}

describe('EquipmentAssignmentController', () => {
  it('gives the cost to whoever reads budgets, and nothing of it to a foreman', async () => {
    const { controller } = build();

    const [manager] = (await controller.findAll(UserRole.SITE_MANAGER, new GetEquipmentAssignmentsDto()))
      .items;
    const [foreman] = (await controller.findAll(UserRole.FOREMAN, new GetEquipmentAssignmentsDto())).items;

    expect(manager.cost).toBe(4_500);
    expect(manager.equipment).toEqual({
      id: 'eq-1',
      designation: 'Compacteur HAMM',
      typeCode: 'tandem_roller',
      fleetNumber: 'CP-03',
    });
    expect(manager.days).toBe(10);
    expect(JSON.parse(JSON.stringify(foreman))).not.toHaveProperty('cost');
  });

  it('filters by machine or worksite', async () => {
    const { controller, queryBus } = build();

    await controller.findAll(
      UserRole.ADMIN,
      Object.assign(new GetEquipmentAssignmentsDto(), { worksiteId: 'ws-1' }),
    );

    const query = queryBus.execute.mock.calls[0][0] as GetEquipmentAssignmentsQuery;
    expect(query.params.filters).toEqual({ equipmentId: undefined, worksiteId: 'ws-1' });
  });

  it('creates, moves and cancels through the right commands', async () => {
    const { controller, commandBus } = build();

    await controller.create('org-1', UserRole.ADMIN, {
      equipmentId: 'eq-1',
      worksiteId: 'ws-1',
      startDate: '2026-04-01',
      endDate: '2026-04-10',
    });
    await controller.update(UserRole.ADMIN, 'as-1', { endDate: '2026-04-12' });
    await expect(controller.remove('as-1')).resolves.toBeUndefined();

    const [create, update, remove] = commandBus.execute.mock.calls.map((call) => call[0]);
    expect(create).toBeInstanceOf(CreateEquipmentAssignmentCommand);
    expect(update).toBeInstanceOf(UpdateEquipmentAssignmentCommand);
    expect(remove).toBeInstanceOf(DeleteEquipmentAssignmentCommand);
  });
});

describe('EquipmentCatalogController', () => {
  it('serves what the query returns', async () => {
    const queryBus = { execute: vi.fn(async () => [{ code: 'compaction' }]) };

    const catalog = await new EquipmentCatalogController(queryBus as unknown as QueryBus).findAll();

    expect(catalog).toEqual([{ code: 'compaction' }]);
  });
});
