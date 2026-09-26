import { cleanup, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { WorksiteCosts } from './worksite-costs';
import { WorksiteSelect } from './worksite-select';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(apiClient);
});

afterEach(() => {
  mock.restore();
  cleanup();
});

describe('WorksiteCosts', () => {
  it('breaks the cost down — labour, expenses, equipment — against the budget', async () => {
    mock.onGet('/worksites/ws-1/costs').reply(200, {
      worksiteId: 'ws-1',
      laborCost: 160,
      expensesCost: 1000,
      equipmentCost: 4500,
      actualCost: 5660,
      totalBudget: 10000,
      variance: 4340,
    });
    renderWithProviders(<WorksiteCosts worksiteId="ws-1" />);

    expect(await screen.findByText('Matériel')).toBeTruthy();
    expect(screen.getByText(/4\s?500,00/)).toBeTruthy();
    expect(screen.getByText(/5\s?660,00/)).toBeTruthy();
    expect(screen.getByText(/4\s?340,00/)).toBeTruthy();
  });

  it('shows no variance without a budget', async () => {
    mock.onGet('/worksites/ws-1/costs').reply(200, {
      worksiteId: 'ws-1',
      laborCost: 0,
      expensesCost: 0,
      equipmentCost: 0,
      actualCost: 0,
      totalBudget: null,
      variance: null,
    });
    renderWithProviders(<WorksiteCosts worksiteId="ws-1" />);

    expect(await screen.findByText('Coût total')).toBeTruthy();
    expect(screen.queryByText('Écart')).toBeNull();
  });

  it('says so when the costs cannot be computed', async () => {
    mock.onGet('/worksites/ws-1/costs').reply(500, { message: 'boom' });
    renderWithProviders(<WorksiteCosts worksiteId="ws-1" />);

    expect(await screen.findByText('Impossible de calculer les coûts du chantier.')).toBeTruthy();
  });
});

describe('WorksiteSelect', () => {
  it('asks for every worksite at once, and names each by code and name', async () => {
    mock.onGet(/\/worksites/).reply(200, {
      items: [{ id: 'ws-1', code: 'RN1', name: 'Réfection RN1' }],
      total: 1,
      page: 1,
      limit: 1,
    });
    renderWithProviders(<WorksiteSelect label="Chantier" value="" onChange={() => {}} />);

    expect(await screen.findByRole('option', { name: 'RN1 · Réfection RN1' })).toBeTruthy();
    expect(String(mock.history.get[0]?.url)).toContain('paginated=false');
  });
});
