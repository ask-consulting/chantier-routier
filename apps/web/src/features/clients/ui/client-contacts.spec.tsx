import { cleanup, screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientType, Permission, type IClient } from '@chantia/shared';
import { apiClient } from '@/shared/api/http-client';
import { renderWithProviders } from '@/test/render';
import { ClientContacts } from './client-contacts';

let granted = new Set<Permission>(Object.values(Permission));
vi.mock('@/features/auth', () => ({
  usePermission: (permission: Permission) => granted.has(permission),
}));

const sousse: IClient = {
  id: 'client-1',
  organizationId: 'org-1',
  type: ClientType.LEGAL_ENTITY,
  firstName: null,
  lastName: null,
  legalName: 'Municipalité de Sousse',
  displayName: 'Municipalité de Sousse',
  billingAddress: { line1: null, line2: null, postalCode: null, city: 'Sousse', country: 'TN' },
  contacts: [
    {
      id: 'c-1',
      firstName: 'Sami',
      lastName: 'Trabelsi',
      position: 'Directeur technique',
      mobilePhone: '+216 98 123 456',
      landlinePhone: '+216 73 000 000',
      email: 'sami@sousse.tn',
      isPrimary: true,
    },
  ],
};

let mock: MockAdapter;

beforeEach(() => {
  granted = new Set(Object.values(Permission));
  mock = new MockAdapter(apiClient);
});

afterEach(() => {
  mock.restore();
  cleanup();
});

describe('ClientContacts', () => {
  it('lists the contacts, every number dialable, the primary one marked', async () => {
    mock.onGet('/clients/client-1').reply(200, sousse);
    renderWithProviders(<ClientContacts clientId="client-1" />);

    expect(await screen.findByText('Sami Trabelsi')).toBeTruthy();
    expect(screen.getByText('Contact principal')).toBeTruthy();
    expect(screen.getByRole('link', { name: /98 123 456/ }).getAttribute('href')).toBe(
      'tel:+21698123456',
    );
    expect(screen.getByRole('link', { name: /sami@sousse.tn/ }).getAttribute('href')).toBe(
      'mailto:sami@sousse.tn',
    );
  });

  it('shows nothing, and asks for nothing, without client:read', () => {
    granted = new Set([Permission.WORKSITE_READ]);
    const { container } = renderWithProviders(<ClientContacts clientId="client-1" />);

    expect(container.textContent).toBe('');
    expect(mock.history.get).toHaveLength(0);
  });

  it('says so when there is no contact, and when they cannot load', async () => {
    mock.onGet('/clients/client-1').reply(200, { ...sousse, contacts: [] });
    renderWithProviders(<ClientContacts clientId="client-1" />);
    expect(await screen.findByText('Aucun contact pour l’instant.')).toBeTruthy();
    cleanup();

    mock.reset();
    mock.onGet('/clients/client-1').reply(500, {});
    renderWithProviders(<ClientContacts clientId="client-1" />);
    expect(await screen.findByText('Impossible de charger les contacts.')).toBeTruthy();
  });
});
