import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { ClientType } from '@chantia/shared';
import { CreateClientDto } from './create-client.dto';
import { GetClientsDto } from './get-clients.dto';
import { UpdateClientDto } from './update-client.dto';

/**
 * The request shapes, through the same `class-transformer` + `class-validator`
 * pair the global `ValidationPipe` runs. Nested contacts and the address are
 * the part easiest to get wrong: without `@ValidateNested` + `@Type`, a
 * malformed contact would pass untouched.
 */

async function errorsOf(cls: new () => object, body: object): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, body));
  const flatten = (list: typeof errors, prefix = ''): string[] =>
    list.flatMap((error) => [
      ...(error.constraints ? [`${prefix}${error.property}`] : []),
      ...flatten(error.children ?? [], `${prefix}${error.property}.`),
    ]);
  return flatten(errors);
}

describe('CreateClientDto', () => {
  it('accepts a legal entity with an address and contacts', async () => {
    expect(
      await errorsOf(CreateClientDto, {
        type: ClientType.LEGAL_ENTITY,
        legalName: 'Municipalité de Sousse',
        billingAddress: { line1: 'Avenue Habib Bourguiba', city: 'Sousse', country: 'TN' },
        contacts: [
          {
            lastName: 'Trabelsi',
            mobilePhone: '+216 98 123 456',
            landlinePhone: '73.123.456',
            email: 'sami@commune-sousse.tn',
            isPrimary: true,
          },
        ],
      }),
    ).toEqual([]);
  });

  it('refuses an unknown type', async () => {
    expect(await errorsOf(CreateClientDto, { type: 'company' })).toContain('type');
  });

  it('validates each contact — phone, email, a last name', async () => {
    const errors = await errorsOf(CreateClientDto, {
      type: ClientType.INDIVIDUAL,
      contacts: [{ lastName: '', mobilePhone: 'call me', email: 'not-an-email' }],
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        'contacts.0.lastName',
        'contacts.0.mobilePhone',
        'contacts.0.email',
      ]),
    );
  });

  it('refuses a country that is not an ISO code', async () => {
    expect(
      await errorsOf(CreateClientDto, {
        type: ClientType.LEGAL_ENTITY,
        billingAddress: { country: 'Tunisie' },
      }),
    ).toContain('billingAddress.country');
  });

  it('refuses a contact id that is not a uuid', async () => {
    expect(
      await errorsOf(CreateClientDto, {
        type: ClientType.LEGAL_ENTITY,
        contacts: [{ id: '42', lastName: 'X' }],
      }),
    ).toContain('contacts.0.id');
  });
});

describe('UpdateClientDto', () => {
  it('accepts an empty change', async () => {
    expect(await errorsOf(UpdateClientDto, {})).toEqual([]);
  });

  it('still validates nested contacts', async () => {
    expect(
      await errorsOf(UpdateClientDto, { contacts: [{ lastName: 'X', email: 'nope' }] }),
    ).toContain('contacts.0.email');
  });
});

describe('GetClientsDto', () => {
  it('refuses a sort key outside the allow-list', async () => {
    expect(await errorsOf(GetClientsDto, { sortField: 'deletedAt' })).toContain('sortField');
  });

  it('reads the query string types', async () => {
    const dto = plainToInstance(GetClientsDto, { page: '2', paginated: 'false' });

    expect(dto.page).toBe(2);
    expect(dto.paginated).toBe(false);
  });
});
