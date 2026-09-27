import { cleanup, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IEquipmentAssignment } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { WorksiteEquipment } from './worksite-equipment';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const stay: IEquipmentAssignment = {
  id: 'as-1',
  organizationId: 'org-1',
  equipmentId: 'eq-1',
  worksiteId: 'ws-1',
  startDate: '2026-09-01',
  endDate: '2026-09-10',
  days: 10,
  notes: null,
  equipment: { id: 'eq-1', designation: 'Compacteur HAMM', typeCode: 'tandem_roller', fleetNumber: 'CP-03' },
  worksite: { id: 'ws-1', code: 'RN1', name: 'Réfection RN1' },
  cost: 4500,
};

let mock: MockAdapter;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-05T10:00:00Z'));
  mock = new MockAdapter(apiClient);
});

afterEach(() => {
  vi.useRealTimers();
  mock.restore();
  cleanup();
});

describe('WorksiteEquipment', () => {
  it('lists the machines booked on the worksite, with their phase and cost', async () => {
    mock.onGet(/\/equipment-assignments/).reply(200, { items: [stay], total: 1, page: 1, limit: 100 });
    renderWithProviders(<WorksiteEquipment worksiteId="ws-1" />);

    expect(await screen.findByText(/Compacteur HAMM/)).toBeTruthy();
    expect(screen.getByText('En cours')).toBeTruthy();
    expect(screen.getByText(/4\s?500,00/)).toBeTruthy();
    expect(String(mock.history.get[0]?.url)).toContain('worksiteId=ws-1');
    expect(
      screen.getByRole('link', { name: 'Gérer le planning du matériel' }).getAttribute('href'),
    ).toBe('/equipment');
  });

  it('says so when none is booked, and when the planning cannot load', async () => {
    mock.onGet(/\/equipment-assignments/).reply(200, { items: [], total: 0, page: 1, limit: 100 });
    renderWithProviders(<WorksiteEquipment worksiteId="ws-1" />);
    expect(await screen.findByText('Aucun matériel affecté à ce chantier.')).toBeTruthy();
    cleanup();

    mock.reset();
    mock.onGet(/\/equipment-assignments/).reply(500, {});
    renderWithProviders(<WorksiteEquipment worksiteId="ws-1" />);
    expect(await screen.findByText('Impossible de charger les affectations.')).toBeTruthy();
  });
});
