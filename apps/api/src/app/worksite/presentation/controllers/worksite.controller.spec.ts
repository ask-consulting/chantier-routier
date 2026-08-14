import { ForbiddenException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { describe, expect, it, vi } from 'vitest';
import { UserRole, WorksiteStatus } from '@chantia/shared';
import { Worksite } from '../../domain/entities/worksite.entity';
import { GetWorksitesDto } from '../dto/get-worksites.dto';
import { WorksiteController } from './worksite.controller';

/**
 * The regression this file exists for.
 *
 * `budget:read` is split from `worksite:read` so that field staff see the site
 * without its margin. The interface honoured that by hiding a column — while the
 * API kept putting `totalBudget` in the payload. Reading it took opening the
 * network tab: no exploit, no injection, just looking.
 *
 * A permission enforced only in the browser protects what a person *does*, never
 * what they *see*. These tests pin the difference.
 */

const BUDGET = 250_000;

function aWorksite(): Worksite {
  return new Worksite(
    'worksite-1',
    'org-1',
    'CH-001',
    'Rocade nord',
    'Ville de Casablanca',
    null,
    null,
    null,
    null,
    null,
    WorksiteStatus.IN_PROGRESS,
    BUDGET,
  );
}

/**
 * What actually leaves the server.
 *
 * Asserting on the DTO object would be misleading: a declared class field exists
 * from `new` onwards, holding `undefined`, so the key is present in memory
 * whatever we do. `JSON.stringify` drops it — and the serialised payload is the
 * contract the client sees, so that is what these tests inspect.
 */
function onTheWire(dto: unknown): Record<string, unknown> {
  return JSON.parse(JSON.stringify(dto)) as Record<string, unknown>;
}

function build(worksite = aWorksite()) {
  const queryBus = {
    execute: vi.fn().mockResolvedValue({ items: [worksite], total: 1, page: 1, limit: 20 }),
  } as unknown as QueryBus;
  const commandBus = { execute: vi.fn().mockResolvedValue(worksite) } as unknown as CommandBus;

  return new WorksiteController(queryBus, commandBus);
}

describe('WorksiteController — who gets to see money', () => {
  it('omits the budget key entirely for a foreman', async () => {
    const result = await build().findAll(UserRole.FOREMAN, new GetWorksitesDto());
    const [item] = result.items;

    // Not `toBeNull`: a null budget is a real, different fact — a worksite whose
    // budget was never set. The key must be **absent**, so the value never
    // reaches the client at all.
    expect(onTheWire(item)).not.toHaveProperty('totalBudget');
    expect(JSON.stringify(item)).not.toContain(String(BUDGET));
  });

  it('keeps the budget for a site manager', async () => {
    const result = await build().findAll(UserRole.SITE_MANAGER, new GetWorksitesDto());

    expect(result.items[0].totalBudget).toBe(BUDGET);
  });

  it('omits it on the detail route too', async () => {
    const queryBus = { execute: vi.fn().mockResolvedValue(aWorksite()) } as unknown as QueryBus;
    const controller = new WorksiteController(queryBus, {} as CommandBus);

    const worker = await controller.findOne(UserRole.WORKER, 'worksite-1');
    const admin = await controller.findOne(UserRole.ADMIN, 'worksite-1');

    expect(onTheWire(worker)).not.toHaveProperty('totalBudget');
    expect(admin.totalBudget).toBe(BUDGET);
  });
});

describe('WorksiteController — sorting is a read of its own', () => {
  it('refuses to sort by budget without budget:read', async () => {
    const dto = new GetWorksitesDto();
    dto.sortField = 'totalBudget';

    // Ordering by a hidden column never prints a figure, yet hands over the
    // ranking of every budget — which for a dozen worksites is most of it.
    await expect(build().findAll(UserRole.FOREMAN, dto)).rejects.toThrow(ForbiddenException);
  });

  it('allows the same sort for a site manager', async () => {
    const dto = new GetWorksitesDto();
    dto.sortField = 'totalBudget';

    await expect(build().findAll(UserRole.SITE_MANAGER, dto)).resolves.toBeDefined();
  });

  it('leaves harmless sort keys alone', async () => {
    const dto = new GetWorksitesDto();
    dto.sortField = 'name';

    await expect(build().findAll(UserRole.FOREMAN, dto)).resolves.toBeDefined();
  });
});
