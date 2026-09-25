import { describe, expect, it, vi } from 'vitest';
import { WorksiteStatus } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { GetWorksiteByIdHandler } from './queries/get-worksite-by-id.handler';
import { GetWorksiteByIdQuery } from './queries/get-worksite-by-id.query';
import { GetWorksiteCostsHandler } from './queries/get-worksite-costs.handler';
import { GetWorksiteCostsQuery } from './queries/get-worksite-costs.query';
import { GetWorksitesHandler } from './queries/get-worksites.handler';
import { GetWorksitesQuery } from './queries/get-worksites.query';
import { Worksite } from '../domain/entities/worksite.entity';
import { WorksiteRepositoryPort } from '../domain/ports/worksite-repository.port';

/**
 * The read side. Thin on purpose — the repository filters tenants and
 * soft-deleted rows — but two rules live here and nowhere else:
 *
 *   - a worksite that is not found is a 404, never a 403: a 403 would confirm
 *     another tenant's id exists;
 *   - the costs of a worksite nobody can read are never computed: the lookup
 *     comes first, so a deleted or foreign worksite cannot leak its totals.
 */

const worksite = Worksite.create({
  id: 'worksite-1',
  organizationId: 'org-1',
  code: 'RN7-2026',
  name: 'Réfection RN7',
  status: WorksiteStatus.IN_PROGRESS,
  totalBudget: 10_000,
});

function repositoryWith(found: Worksite | null) {
  return {
    search: vi.fn(async () => ({ items: [worksite], total: 1, page: 1, limit: 20 })),
    findById: vi.fn(async () => found),
    save: vi.fn(),
    findCostInputs: vi.fn(async () => ({
      timesheets: [{ hoursWorked: 8, hourlyRate: 20 }],
      expenses: [{ amount: 1_000 }],
    })),
  } satisfies WorksiteRepositoryPort;
}

describe('GetWorksitesHandler', () => {
  it('hands the search parameters through untouched', async () => {
    const repository = repositoryWith(worksite);
    const params = { page: 2, filters: { status: WorksiteStatus.COMPLETED } };

    const result = await new GetWorksitesHandler(repository).execute(new GetWorksitesQuery(params));

    expect(repository.search).toHaveBeenCalledWith(params);
    expect(result.items).toEqual([worksite]);
  });
});

describe('GetWorksiteByIdHandler', () => {
  it('returns the worksite', async () => {
    const handler = new GetWorksiteByIdHandler(repositoryWith(worksite));

    await expect(handler.execute(new GetWorksiteByIdQuery('worksite-1'))).resolves.toBe(worksite);
  });

  it('answers not-found — never forbidden — for an unknown or foreign id', async () => {
    const handler = new GetWorksiteByIdHandler(repositoryWith(null));

    await expect(handler.execute(new GetWorksiteByIdQuery('nope'))).rejects.toBeInstanceOf(
      ResourceNotFoundException,
    );
  });
});

describe('GetWorksiteCostsHandler', () => {
  it('computes labour plus expenses against the budget', async () => {
    const handler = new GetWorksiteCostsHandler(repositoryWith(worksite));

    const costs = await handler.execute(new GetWorksiteCostsQuery('worksite-1'));

    expect(costs).toMatchObject({
      worksiteId: 'worksite-1',
      laborCost: 160,
      expensesCost: 1_000,
      actualCost: 1_160,
      totalBudget: 10_000,
      variance: 8_840,
    });
  });

  it('never reads the cost inputs of a worksite it cannot find', async () => {
    const repository = repositoryWith(null);

    await expect(
      new GetWorksiteCostsHandler(repository).execute(new GetWorksiteCostsQuery('nope')),
    ).rejects.toBeInstanceOf(ResourceNotFoundException);
    expect(repository.findCostInputs).not.toHaveBeenCalled();
  });
});
