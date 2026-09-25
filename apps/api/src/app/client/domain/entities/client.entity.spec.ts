import { describe, expect, it } from 'vitest';
import { ClientType } from '@chantia/shared';
import { InvalidClientNameException } from '../exceptions/client.exceptions';
import { ClientContact } from './client-contact.entity';
import { Client } from './client.entity';

/**
 * The two invariants the aggregate owns: names that fit the type, and exactly
 * one primary contact. Everything that writes a client goes through here.
 */

function contact(id: string, isPrimary = false): ClientContact {
  return ClientContact.create({ id, lastName: `Contact ${id}`, isPrimary });
}

function aMunicipality(): Client {
  return Client.create({
    id: 'client-1',
    organizationId: 'org-1',
    type: ClientType.LEGAL_ENTITY,
    legalName: 'Municipalité de Sousse',
    billingAddress: { line1: 'Avenue Habib Bourguiba', city: 'Sousse', postalCode: '4000' },
    contacts: [contact('a'), contact('b', true)],
  });
}

describe('Client — names and type', () => {
  it('names a legal entity by its legal name', () => {
    expect(aMunicipality().displayName).toBe('Municipalité de Sousse');
  });

  it('refuses an individual without a first name', () => {
    expect(() =>
      Client.create({ id: 'c', organizationId: 'o', type: ClientType.INDIVIDUAL, lastName: 'Benali' }),
    ).toThrow(InvalidClientNameException);
  });

  it('refuses a legal entity without a legal name, even with a person’s name', () => {
    expect(() =>
      Client.create({
        id: 'c',
        organizationId: 'o',
        type: ClientType.LEGAL_ENTITY,
        firstName: 'Karim',
        lastName: 'Benali',
      }),
    ).toThrow(InvalidClientNameException);
  });

  it('clears the other type’s names when the type switches', () => {
    const person = aMunicipality().with({
      type: ClientType.INDIVIDUAL,
      firstName: 'Karim',
      lastName: 'Benali',
    });

    expect(person.legalName).toBeNull();
    expect(person.displayName).toBe('Benali Karim');

    const backAgain = person.with({ type: ClientType.LEGAL_ENTITY, legalName: 'STEG' });
    expect(backAgain.firstName).toBeNull();
    expect(backAgain.lastName).toBeNull();
  });

  it('refuses a switch that leaves the new type without its names', () => {
    expect(() => aMunicipality().with({ type: ClientType.INDIVIDUAL })).toThrow(
      InvalidClientNameException,
    );
  });
});

describe('Client — billing address', () => {
  it('defaults the country to Tunisia, upper-cased', () => {
    expect(aMunicipality().billingAddress.country).toBe('TN');
    const french = aMunicipality().with({ billingAddress: { country: 'fr' } });
    expect(french.billingAddress.country).toBe('FR');
  });

  it('merges field by field — changing the city keeps the street', () => {
    const moved = aMunicipality().with({ billingAddress: { city: 'Monastir' } });

    expect(moved.billingAddress.city).toBe('Monastir');
    expect(moved.billingAddress.line1).toBe('Avenue Habib Bourguiba');
  });

  it('stores a blank field as null', () => {
    expect(aMunicipality().with({ billingAddress: { line2: '   ' } }).billingAddress.line2).toBeNull();
  });
});

describe('Client — contacts', () => {
  it('keeps the flagged contact as the only primary', () => {
    const client = aMunicipality();

    expect(client.primaryContact?.id).toBe('b');
    expect(client.contacts.filter((c) => c.isPrimary)).toHaveLength(1);
  });

  it('makes the first contact primary when the primary one is removed', () => {
    const client = aMunicipality().with({ contacts: [contact('a'), contact('c')] });

    expect(client.primaryContact?.id).toBe('a');
  });

  it('keeps the contacts when a change does not mention them', () => {
    expect(aMunicipality().with({ legalName: 'Commune de Sousse' }).contacts).toHaveLength(2);
  });

  it('has no primary contact when it has no contact', () => {
    expect(aMunicipality().with({ contacts: [] }).primaryContact).toBeNull();
  });
});

describe('Client — deletion', () => {
  it('marks the client deleted and keeps everything else', () => {
    const deleted = aMunicipality().deleted(new Date('2026-09-26'));

    expect(deleted.isDeleted()).toBe(true);
    expect(deleted.contacts).toHaveLength(2);
    expect(deleted.displayName).toBe('Municipalité de Sousse');
  });
});
