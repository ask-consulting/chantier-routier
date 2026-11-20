import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { MaterialUnit } from '@chantia/shared';
import {
  CreateOwnMaterialCommand,
  GetMaterialCatalogQuery,
  GetOwnMaterialsQuery,
  RemoveOwnMaterialCommand,
  UpdateOwnMaterialCommand,
} from '../../application/material.messages';
import { MaterialController } from './material.controller';

describe('the material routes', () => {
  const query = vi.fn();
  const command = vi.fn();
  const controller = new MaterialController(
    { execute: query } as unknown as QueryBus,
    { execute: command } as unknown as CommandBus,
  );

  it('passes each read and change down', async () => {
    const data = { categoryId: 'c', label: 'Sable', unit: MaterialUnit.CUBIC_METRE };
    await controller.catalog();
    await controller.findOwn();
    await controller.create('org', data);
    await controller.update('m', { label: 'Gravier' });
    await controller.remove('m');

    expect(query.mock.calls.map((call) => call[0])).toEqual([
      new GetMaterialCatalogQuery(),
      new GetOwnMaterialsQuery(),
    ]);
    expect(command.mock.calls.map((call) => call[0])).toEqual([
      new CreateOwnMaterialCommand('org', data),
      new UpdateOwnMaterialCommand('m', { label: 'Gravier' }),
      new RemoveOwnMaterialCommand('m'),
    ]);
  });
});
