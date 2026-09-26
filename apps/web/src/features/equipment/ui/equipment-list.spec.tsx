import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AcquisitionMethod,
  EquipmentCategory,
  EquipmentStatus,
  Permission,
  type IEquipment,
} from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { EquipmentListPage } from './equipment-list-page';
import { EquipmentList } from './equipment-table';

let granted = new Set<Permission>(Object.values(Permission));
vi.mock('@/features/auth', () => ({
  Can: ({
    permission,
    children,
  }: {
    permission: Permission | Permission[];
    children: React.ReactNode;
  }) =>
    (Array.isArray(permission) ? permission : [permission]).every((p) => granted.has(p))
      ? children
      : null,
  usePermission: (permission: Permission) => granted.has(permission),
  useEveryPermission: (permissions: Permission[]) => permissions.every((p) => granted.has(p)),
}));

const roller: IEquipment = {
  id: 'eq-1',
  organizationId: 'org-1',
  typeCode: 'tandem_roller',
  designation: 'Compacteur HAMM HD12',
  fleetNumber: 'CP-03',
  brand: null,
  model: null,
  serialNumber: null,
  registrationNumber: null,
  manufactureYear: null,
  status: EquipmentStatus.UNDER_MAINTENANCE,
  acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
  acquisitionDate: '2026-01-01',
  supplier: null,
  contractEndDate: null,
  disposalDate: null,
  notes: null,
  purchasePrice: 219000,
  dailyCost: 120,
  depreciationEndDate: '2030-12-31',
};

let mock: MockAdapter;

function listBody(items: IEquipment[]) {
  return { items, total: items.length, page: 1, limit: 20 };
}

function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

beforeEach(() => {
  granted = new Set(Object.values(Permission));
  mock = new MockAdapter(apiClient);
  mockReply(200, listBody([roller]));
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
  };
});

afterEach(() => {
  mock.restore();
  cleanup();
});

describe('EquipmentList', () => {
  it('names the type and the status, and shows today’s cost to whoever reads budgets', () => {
    renderWithProviders(<EquipmentList equipment={[roller]} onEdit={() => {}} />);

    expect(screen.getAllByText('Compacteur tandem').length).toBeGreaterThan(0);
    expect(screen.getAllByText('En maintenance').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/120,00/).length).toBeGreaterThan(0);
  });

  it('gives a foreman neither the money nor the actions', () => {
    granted = new Set([Permission.EQUIPMENT_READ]);
    renderWithProviders(<EquipmentList equipment={[roller]} onEdit={() => {}} />);

    expect(screen.queryByText('Coût / jour')).toBeNull();
    expect(screen.queryByText(/120,00/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Modifier/ })).toBeNull();
  });

  it('keeps the actions from a manager who may not set money', () => {
    granted = new Set([Permission.EQUIPMENT_READ, Permission.EQUIPMENT_MANAGE, Permission.BUDGET_READ]);
    renderWithProviders(<EquipmentList equipment={[roller]} onEdit={() => {}} />);

    expect(screen.queryByRole('button', { name: /Supprimer/ })).toBeNull();
  });

  it('deletes once confirmed, pointing a sold machine to "Retiré" instead', async () => {
    renderWithProviders(<EquipmentList equipment={[roller]} onEdit={() => {}} />);
    mockReply(204);

    fireEvent.click(screen.getAllByRole('button', { name: /Supprimer Compacteur HAMM HD12/ })[0]);
    expect(screen.getAllByText(/passez plutôt son statut à « Retiré »/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer le matériel' })[0]);

    await waitFor(() => {
      expect(mock.history.delete[0]?.url).toMatch(/\/equipment\/eq-1$/);
    });
  });

  it('calls onEdit with the machine', () => {
    const onEdit = vi.fn();
    renderWithProviders(<EquipmentList equipment={[roller]} onEdit={onEdit} />);

    fireEvent.click(screen.getAllByRole('button', { name: /Modifier Compacteur HAMM HD12/ })[0]);

    expect(onEdit).toHaveBeenCalledWith(roller);
  });
});

describe('EquipmentListPage', () => {
  it('lists the fleet with its count', async () => {
    renderWithProviders(<EquipmentListPage />);

    expect(await screen.findAllByText('Compacteur HAMM HD12')).not.toHaveLength(0);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('sends the category and the status to the server', async () => {
    renderWithProviders(<EquipmentListPage />);
    await screen.findAllByText('Compacteur HAMM HD12');

    const outside = (label: string) =>
      screen.getAllByLabelText(label).find((element) => element.closest('dialog') === null) as HTMLElement;
    fireEvent.change(outside('Catégorie'), { target: { value: EquipmentCategory.COMPACTION } });
    fireEvent.change(outside('Statut'), { target: { value: EquipmentStatus.RETIRED } });

    await waitFor(() => {
      const asked = mock.history.get.map((request) => String(request.url));
      expect(asked.some((url) => url.includes('category=compaction') && url.includes('status=retired'))).toBe(
        true,
      );
    });
  });

  it('says "aucun matériel" when the fleet is empty, and "no result" under a search', async () => {
    mockReply(200, listBody([]));
    renderWithProviders(<EquipmentListPage />);

    expect(await screen.findByText('Aucun matériel')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Rechercher'), { target: { value: 'volvo' } });
    expect(await screen.findByText('Aucun matériel ne correspond')).toBeTruthy();
  });

  it('reports a failed load', async () => {
    mockReply(500, { message: 'Base injoignable' });
    renderWithProviders(<EquipmentListPage />);

    expect(await screen.findByText(/Base injoignable/)).toBeTruthy();
  });

  it('opens the create drawer', async () => {
    renderWithProviders(<EquipmentListPage />);
    await screen.findAllByText('Compacteur HAMM HD12');

    fireEvent.click(screen.getByRole('button', { name: 'Nouveau matériel' }));

    expect(await screen.findByText('Ajouter un matériel')).toBeTruthy();
  });
});
