import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AcquisitionMethod,
  EquipmentStatus,
  Permission,
  type IEquipment,
  type IEquipmentAssignment,
} from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { AssignmentsDrawer, type WorksitePickerProps } from './assignments-drawer';

/**
 * One machine's planning.
 *
 *   1. **A foreman sees where the machine is, not what it costs, and books nothing.**
 *   2. **The form says what it can see before the API does** — days the
 *      machine is not there, a period backwards — and previews the cost.
 *   3. **An overlap is the API's to refuse**, and its message, naming the
 *      worksite in the way, is shown as is.
 */

let granted = new Set<Permission>(Object.values(Permission));
vi.mock('@/features/auth', () => ({
  usePermission: (permission: Permission) => granted.has(permission),
}));

/** Stands in for the worksites feature's picker, which the route hands in. */
function StubWorksitePicker({ label, value, onChange, error }: WorksitePickerProps) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">—</option>
        <option value="ws-1">RN1</option>
        <option value="ws-2">MN-04</option>
      </select>
      {error && <span>{error}</span>}
    </label>
  );
}

/** Hired from 2026-03-01 to 2026-12-31 at 450 a day — as a budget reader receives it. */
const roller: IEquipment = {
  id: 'eq-1',
  organizationId: 'org-1',
  typeCode: 'tandem_roller',
  designation: 'Compacteur HAMM',
  fleetNumber: 'CP-03',
  brand: null,
  model: null,
  serialNumber: null,
  registrationNumber: null,
  manufactureYear: null,
  status: EquipmentStatus.IN_SERVICE,
  acquisitionMethod: AcquisitionMethod.SHORT_TERM_RENTAL,
  acquisitionDate: '2026-03-01',
  supplier: null,
  contractEndDate: '2026-12-31',
  disposalDate: null,
  notes: null,
  dailyRate: 450,
  dailyCost: 450,
};

const atSousse: IEquipmentAssignment = {
  id: 'as-1',
  organizationId: 'org-1',
  equipmentId: 'eq-1',
  worksiteId: 'ws-1',
  startDate: '2026-04-01',
  endDate: '2026-04-10',
  days: 10,
  notes: 'Avec chauffeur',
  equipment: { id: 'eq-1', designation: 'Compacteur HAMM', typeCode: 'tandem_roller', fleetNumber: 'CP-03' },
  worksite: { id: 'ws-1', code: 'RN1', name: 'Réfection RN1' },
  cost: 4500,
};

let mock: MockAdapter;

function serve(assignments: IEquipmentAssignment[], write: [number, unknown] = [201, atSousse]): void {
  mock.reset();
  mock.onGet(/\/equipment-assignments/).reply(200, {
    items: assignments,
    total: assignments.length,
    page: 1,
    limit: 100,
  });
  mock.onAny().reply(...write);
}

function change(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function open(equipment: IEquipment = roller) {
  return renderWithProviders(
    <AssignmentsDrawer equipment={equipment} onClose={() => {}} WorksitePicker={StubWorksitePicker} />,
  );
}

beforeEach(() => {
  granted = new Set(Object.values(Permission));
  mock = new MockAdapter(apiClient);
  serve([atSousse]);
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

describe('AssignmentsDrawer, the planning', () => {
  it('lists where the machine is booked, with the days and the cost', async () => {
    open();

    expect(await screen.findByText('RN1 · Réfection RN1')).toBeTruthy();
    expect(screen.getByText(/10 jours/)).toBeTruthy();
    expect(screen.getByText(/Coût pour le chantier : 4\s?500,00/)).toBeTruthy();
    expect(screen.getByText('Avec chauffeur')).toBeTruthy();
    expect(String(mock.history.get[0]?.url)).toContain('equipmentId=eq-1');
  });

  it('says so when the machine is booked nowhere', async () => {
    serve([]);
    open();

    expect(await screen.findByText('Ce matériel n’est affecté à aucun chantier.')).toBeTruthy();
  });

  it('gives a foreman the planning without the booking form', async () => {
    granted = new Set([Permission.EQUIPMENT_READ]);
    const { cost: _hidden, ...withoutCost } = atSousse;
    serve([withoutCost]);
    open();

    expect(await screen.findByText('RN1 · Réfection RN1')).toBeTruthy();
    expect(screen.queryByText(/Coût pour le chantier/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Affecter' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Annuler l’affectation/ })).toBeNull();
  });
});

describe('AssignmentsDrawer, booking', () => {
  it('books the machine and previews what it will cost the worksite', async () => {
    open();
    await screen.findByText('RN1 · Réfection RN1');

    change('Chantier', 'ws-2');
    change('Du', '2026-05-01');
    change('Au (inclus)', '2026-05-10');

    expect(screen.getByText(/Coût pour le chantier sur la période : 4\s?500,00/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Affecter' }));

    await waitFor(() => {
      expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
        equipmentId: 'eq-1',
        worksiteId: 'ws-2',
        startDate: '2026-05-01',
        endDate: '2026-05-10',
        notes: null,
      });
    });
  });

  it('refuses, on the spot, days the machine is not there', async () => {
    open();
    await screen.findByText('RN1 · Réfection RN1');

    change('Chantier', 'ws-2');
    change('Du', '2026-02-01');
    change('Au (inclus)', '2027-01-05');

    expect(screen.getByText('Le matériel n’est pas encore disponible à cette date')).toBeTruthy();
    expect(screen.getByText(/n’est plus disponible à cette date/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Affecter' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('refuses a period that runs backwards', async () => {
    open();
    await screen.findByText('RN1 · Réfection RN1');

    change('Du', '2026-05-10');
    change('Au (inclus)', '2026-05-01');

    expect(screen.getByText('La fin prévue ne peut pas précéder le début')).toBeTruthy();
  });

  it('shows the API’s overlap as it names it', async () => {
    serve([atSousse], [409, { message: 'The machine is already assigned to RN1 Réfection RN1 from 2026-04-01 to 2026-04-10' }]);
    open();
    await screen.findByText('RN1 · Réfection RN1');

    change('Chantier', 'ws-2');
    change('Du', '2026-04-05');
    change('Au (inclus)', '2026-04-15');
    fireEvent.click(screen.getByRole('button', { name: 'Affecter' }));

    expect(await screen.findByText(/already assigned to RN1/)).toBeTruthy();
  });

  it('puts an unknown worksite under the picker, and anything else in a general alert', async () => {
    serve([atSousse], [400, { message: 'x', errors: [{ field: 'worksiteId', code: 'form.errors.unknownWorksite', message: 'x' }] }]);
    open();
    await screen.findByText('RN1 · Réfection RN1');
    change('Chantier', 'ws-2');
    change('Du', '2026-05-01');
    change('Au (inclus)', '2026-05-02');
    fireEvent.click(screen.getByRole('button', { name: 'Affecter' }));
    expect(await screen.findByText('Ce chantier n’existe pas ou plus')).toBeTruthy();

    serve([atSousse], [500, { message: 'boom' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Affecter' }));
    expect(await screen.findByText('L’affectation n’a pas pu être enregistrée.')).toBeTruthy();
  });
});

describe('AssignmentsDrawer, moving and cancelling', () => {
  it('moves an assignment through PATCH, prefilled', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: /Modifier l’affectation à RN1/ }));

    expect((screen.getByLabelText('Du') as HTMLInputElement).value).toBe('2026-04-01');
    change('Au (inclus)', '2026-04-15');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(mock.history.patch[0]?.url).toMatch(/\/equipment-assignments\/as-1$/);
      expect(JSON.parse(mock.history.patch[0]?.data as string)).toMatchObject({ endDate: '2026-04-15' });
    });
  });

  it('cancels one once confirmed', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: /Annuler l’affectation à RN1/ }));
    serve([atSousse], [204, undefined]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Annuler l’affectation' })[0]);

    await waitFor(() => {
      expect(mock.history.delete[0]?.url).toMatch(/\/equipment-assignments\/as-1$/);
    });
  });

  it('stays closed, and asks for nothing, without a machine', () => {
    renderWithProviders(<AssignmentsDrawer equipment={null} onClose={() => {}} />);

    expect([...document.querySelectorAll('dialog')].every((dialog) => !dialog.open)).toBe(true);
    expect(mock.history.get).toHaveLength(0);
  });
});
