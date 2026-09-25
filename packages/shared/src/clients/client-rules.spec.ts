import { describe, expect, it } from 'vitest';
import { ClientType } from '../enums/client.enums';
import { clientDisplayName, clientNameIsComplete, withSinglePrimary } from './client-rules';

describe('clientDisplayName', () => {
  it('reads an individual by family name first', () => {
    expect(
      clientDisplayName({ type: ClientType.INDIVIDUAL, firstName: ' Karim ', lastName: 'Benali ' }),
    ).toBe('Benali Karim');
  });

  it('drops a missing part rather than leaving a stray space', () => {
    expect(clientDisplayName({ type: ClientType.INDIVIDUAL, lastName: 'Benali', firstName: null })).toBe(
      'Benali',
    );
    expect(clientDisplayName({ type: ClientType.LEGAL_ENTITY, legalName: null })).toBe('');
  });

  it('uses the legal name for an entity, ignoring any stray person name', () => {
    expect(
      clientDisplayName({
        type: ClientType.LEGAL_ENTITY,
        firstName: 'Karim',
        legalName: ' Municipalité de Sousse ',
      }),
    ).toBe('Municipalité de Sousse');
  });
});

describe('clientNameIsComplete', () => {
  it('requires both names for an individual', () => {
    expect(clientNameIsComplete({ type: ClientType.INDIVIDUAL, lastName: 'Benali' })).toBe(false);
    expect(clientNameIsComplete({ type: ClientType.INDIVIDUAL, firstName: 'Karim' })).toBe(false);
    expect(clientNameIsComplete({ type: ClientType.LEGAL_ENTITY })).toBe(false);
    expect(
      clientNameIsComplete({ type: ClientType.INDIVIDUAL, firstName: 'Karim', lastName: 'Benali' }),
    ).toBe(true);
  });

  it('requires a legal name for an entity, and nothing else', () => {
    expect(clientNameIsComplete({ type: ClientType.LEGAL_ENTITY, legalName: '  ' })).toBe(false);
    expect(clientNameIsComplete({ type: ClientType.LEGAL_ENTITY, legalName: 'STEG' })).toBe(true);
  });
});

describe('withSinglePrimary', () => {
  it('makes the first contact primary when none is flagged', () => {
    expect(withSinglePrimary([{ n: 1 }, { n: 2 }]).map((c) => c.isPrimary)).toEqual([true, false]);
  });

  it('keeps only the first flagged one when several are', () => {
    expect(
      withSinglePrimary([{ isPrimary: false }, { isPrimary: true }, { isPrimary: true }]).map(
        (c) => c.isPrimary,
      ),
    ).toEqual([false, true, false]);
  });

  it('leaves an empty list empty', () => {
    expect(withSinglePrimary([])).toEqual([]);
  });
});
