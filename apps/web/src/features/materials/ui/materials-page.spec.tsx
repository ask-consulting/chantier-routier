import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialUnit, Permission } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { MaterialsPage } from './materials-page';

let granted = new Set<Permission>();
vi.mock('@/features/auth', () => ({
  usePermission: (permission: Permission) => granted.has(permission),
  Can: ({ permission, children }: { permission: Permission; children: unknown }) =>
    granted.has(permission) ? children : null,
}));

const catalog = [
  {
    id: 'agg',
    code: 'aggregates',
    labels: { fr: 'Granulats et terres' },
    materials: [
      {
        id: 'trab',
        code: 'fill-earth',
        categoryId: 'agg',
        unit: MaterialUnit.CUBIC_METRE,
        labels: { fr: 'Terre de remblai', 'aeb-Latn': 'Trab' },
      },
    ],
  },
  {
    id: 'road',
    code: 'road',
    labels: { fr: 'Bitumes et enrobés' },
    materials: [
      {
        id: 'zeft',
        code: 'bitumen',
        categoryId: 'road',
        unit: MaterialUnit.TONNE,
        labels: { fr: 'Bitume' },
      },
    ],
  },
];
const own = [{ id: 'oued', categoryId: 'agg', label: 'Sable de oued', unit: MaterialUnit.TONNE }];

let mock: MockAdapter;
beforeEach(() => {
  granted = new Set([Permission.MATERIAL_READ, Permission.MATERIAL_MANAGE]);
  mock = new MockAdapter(apiClient);
  mock.onGet('/material-catalog').reply(200, catalog);
  mock.onGet('/materials').reply(200, own);
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  mock.restore();
  cleanup();
});

describe('MaterialsPage', () => {
  it('shows the catalog by family, with the company’s own materials in it', async () => {
    renderWithProviders(<MaterialsPage />);

    expect(await screen.findByText('Terre de remblai')).toBeTruthy();
    expect(screen.getByText('Bitumes et enrobés')).toBeTruthy();
    expect(screen.getByText('Sable de oued')).toBeTruthy();
    expect(screen.getByText('Ajoutée')).toBeTruthy();
  });

  it('keeps the actions from who may only read', async () => {
    granted = new Set([Permission.MATERIAL_READ]);
    renderWithProviders(<MaterialsPage />);

    await screen.findByText('Sable de oued');
    expect(screen.queryByRole('button', { name: 'Ajouter une matière' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Modifier Sable de oued' })).toBeNull();
  });

  it('adds a material of the company’s own', async () => {
    mock.onPost('/materials').reply(201, {});
    renderWithProviders(<MaterialsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter une matière' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText('Nom'), { target: { value: ' Tuf rouge ' } });
    fireEvent.change(within(dialog).getByLabelText('Unité'), { target: { value: 't' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
      categoryId: 'agg',
      label: 'Tuf rouge',
      unit: 't',
    });
  });

  it('says when the name is taken, or the unit already counted in', async () => {
    mock
      .onPatch('/materials/oued')
      .replyOnce(409, {
        message: 'x',
        errors: [{ field: 'label', code: 'form.errors.materialLabelTaken', message: 'x' }],
      })
      .onPatch('/materials/oued')
      .replyOnce(409, {
        message: 'x',
        errors: [{ field: 'unit', code: 'form.errors.materialUnitInUse', message: 'x' }],
      });
    renderWithProviders(<MaterialsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier Sable de oued' }));
    const dialog = await screen.findByRole('dialog');
    expect((within(dialog).getByLabelText('Nom') as HTMLInputElement).value).toBe('Sable de oued');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(
      await within(dialog).findByText('Une matière de votre entreprise porte déjà ce nom.'),
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(
      await within(dialog).findByText('Une tâche compte déjà cette matière dans son unité.'),
    ).toBeTruthy();
  });

  it('removes one after asking', async () => {
    mock.onDelete('/materials/oued').reply(204);
    renderWithProviders(<MaterialsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer Sable de oued' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer' }));

    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
  });

  it('says when it cannot load', async () => {
    mock.onGet('/materials').reply(500);
    renderWithProviders(<MaterialsPage />);

    expect(await screen.findByText('Impossible de charger les matières.')).toBeTruthy();
  });
});
