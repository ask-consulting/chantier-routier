import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AcquisitionMethod,
  EquipmentCategory,
  EquipmentStatus,
  type IEquipment,
} from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { EquipmentDrawer } from './equipment-drawer';

/**
 * The fleet drawer.
 *
 *   1. **The money section follows the acquisition method** — and only that
 *      method's fields travel.
 *   2. **The lifetime follows the type until it is typed in.**
 *   3. **What the machine will cost per day is previewed**, with the shared
 *      computation.
 */

const grader: IEquipment = {
  id: 'eq-1',
  organizationId: 'org-1',
  typeCode: 'motor_grader',
  designation: 'Niveleuse 140K',
  fleetNumber: 'NV-01',
  brand: 'Caterpillar',
  model: '140K',
  serialNumber: null,
  registrationNumber: null,
  manufactureYear: 2021,
  status: EquipmentStatus.IN_SERVICE,
  acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
  acquisitionDate: '2025-03-01',
  supplier: null,
  contractEndDate: null,
  disposalDate: null,
  notes: null,
  purchasePrice: 420000,
  residualValue: null,
  usefulLifeMonths: 72,
  monthlyPayment: null,
  buyoutValue: null,
  dailyRate: null,
};

let mock: MockAdapter;

function mockReply(status: number, body?: unknown): void {
  mock.reset();
  mock.onAny().reply(status, body);
}

function save(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Enregistrer' }) as HTMLButtonElement;
}

function change(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function pickRoller(): void {
  change('Catégorie', EquipmentCategory.COMPACTION);
  change('Type', 'tandem_roller');
  change('Désignation', 'Compacteur tandem HAMM');
}

beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mockReply(200, grader);
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

describe('EquipmentDrawer, the type', () => {
  it('fills the lifetime from the type, until it is typed in', () => {
    renderWithProviders(<EquipmentDrawer open onClose={() => {}} />);

    pickRoller();
    expect((screen.getByLabelText('Durée d’amortissement (mois)') as HTMLInputElement).value).toBe('60');

    change('Durée d’amortissement (mois)', '48');
    change('Catégorie', EquipmentCategory.SITE_EQUIPMENT);
    change('Type', 'site_hut');
    expect((screen.getByLabelText('Durée d’amortissement (mois)') as HTMLInputElement).value).toBe('48');
  });

  it('only offers the types of the chosen category, and clears one from another', () => {
    renderWithProviders(<EquipmentDrawer open onClose={() => {}} />);
    pickRoller();

    change('Catégorie', EquipmentCategory.SURVEYING);

    expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('');
    expect(screen.getByRole('option', { name: 'Station totale' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Compacteur tandem' })).toBeNull();
  });
});

describe('EquipmentDrawer, the money', () => {
  it('asks a purchase for a price, previews the cost, and sends only purchase fields', async () => {
    renderWithProviders(<EquipmentDrawer open onClose={() => {}} />);
    pickRoller();
    change('Date d’achat', '2026-01-01');
    expect(save().disabled).toBe(true);

    change('Prix d’achat HT', '219000');

    expect(save().disabled).toBe(false);
    expect(screen.getByText(/Amorti le/)).toBeTruthy();
    fireEvent.click(save());

    await waitFor(() => {
      expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
        typeCode: 'tandem_roller',
        acquisitionMethod: AcquisitionMethod.CASH_PURCHASE,
        acquisitionDate: '2026-01-01',
        purchasePrice: 219000,
        usefulLifeMonths: 60,
        monthlyPayment: null,
        dailyRate: null,
        contractEndDate: null,
      });
    });
  });

  it('asks a lease for a payment and an end, and a buyout value', async () => {
    renderWithProviders(<EquipmentDrawer open onClose={() => {}} />);
    pickRoller();
    change('Mode d’acquisition', AcquisitionMethod.LEASING);

    expect(screen.queryByLabelText('Prix d’achat HT')).toBeNull();
    change('Mensualité HT', '3650');
    expect(save().disabled).toBe(true);
    change('Fin du contrat', '2029-12-31');
    change('Valeur de rachat', '15000');
    fireEvent.click(save());

    await waitFor(() => {
      expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
        acquisitionMethod: AcquisitionMethod.LEASING,
        monthlyPayment: 3650,
        buyoutValue: 15000,
        purchasePrice: null,
        usefulLifeMonths: null,
      });
    });
  });

  it('asks a hire for a daily rate only, the end being optional', async () => {
    renderWithProviders(<EquipmentDrawer open onClose={() => {}} />);
    pickRoller();
    change('Mode d’acquisition', AcquisitionMethod.SHORT_TERM_RENTAL);
    change('Tarif journalier HT', '450.5');

    // A regex: the currency format separates with a narrow no-break space.
    expect(screen.getByText(/Coût aujourd’hui : 450,50.*par jour/)).toBeTruthy();
    fireEvent.click(save());

    await waitFor(() => {
      expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
        dailyRate: 450.5,
        contractEndDate: null,
      });
    });
  });

  it('marks a residual value above the price', () => {
    renderWithProviders(<EquipmentDrawer open onClose={() => {}} />);
    pickRoller();
    change('Prix d’achat HT', '1000');
    change('Valeur résiduelle', '2000');

    expect(save().disabled).toBe(true);
    expect(screen.getByText('La valeur résiduelle dépasse le prix d’achat')).toBeTruthy();
  });
});

describe('EquipmentDrawer, editing and state', () => {
  it('prefills the machine, category included, and keeps its own lifetime', () => {
    renderWithProviders(<EquipmentDrawer open equipment={grader} onClose={() => {}} />);

    expect((screen.getByLabelText('Catégorie') as HTMLSelectElement).value).toBe(
      EquipmentCategory.EARTHMOVING,
    );
    expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('motor_grader');
    expect((screen.getByLabelText('Durée d’amortissement (mois)') as HTMLInputElement).value).toBe('72');
    expect(screen.getByText('Modifier le matériel')).toBeTruthy();
  });

  it('asks for a disposal date once retired', async () => {
    renderWithProviders(<EquipmentDrawer open equipment={grader} onClose={() => {}} />);

    change('Statut', EquipmentStatus.RETIRED);
    expect(save().disabled).toBe(true);
    change('Date de cession', '2026-09-01');
    fireEvent.click(save());

    await waitFor(() => {
      const sent = JSON.parse(mock.history.patch[0]?.data as string);
      expect(mock.history.patch[0]?.url).toMatch(/\/equipment\/eq-1$/);
      expect(sent).toMatchObject({ status: EquipmentStatus.RETIRED, disposalDate: '2026-09-01' });
    });
  });

  it('puts a taken fleet number under its field, and stays open', async () => {
    mockReply(409, {
      message: 'Fleet number NV-01 is already used',
      errors: [{ field: 'fleetNumber', code: 'form.errors.fleetNumberTaken', message: '…' }],
    });
    const onClose = vi.fn();
    renderWithProviders(<EquipmentDrawer open equipment={grader} onClose={onClose} />);

    fireEvent.click(save());

    expect(await screen.findByText('Ce numéro de parc est déjà utilisé')).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to a general alert, and closes on success', async () => {
    mockReply(500, { message: 'boom' });
    const onClose = vi.fn();
    renderWithProviders(<EquipmentDrawer open equipment={grader} onClose={onClose} />);

    fireEvent.click(save());
    expect(await screen.findByText('Le matériel n’a pas pu être enregistré.')).toBeTruthy();

    mockReply(200, grader);
    fireEvent.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
