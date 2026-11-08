import { AccessRequestKind, AccessRequestLocale } from '@chantia/shared';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateAccessRequestDto } from './create-access-request.dto';

const VALID = {
  company: 'Société Exemple',
  phone: '+216 71 000 000',
  kind: AccessRequestKind.BUILDING,
  locale: AccessRequestLocale.AR,
};

const invalid = (body: Record<string, unknown>): string[] =>
  validateSync(plainToInstance(CreateAccessRequestDto, body)).map((error) => error.property);

describe('CreateAccessRequestDto', () => {
  it('accepts a complete request', () => {
    expect(invalid(VALID)).toEqual([]);
  });

  it('accepts a company name in Arabic', () => {
    expect(invalid({ ...VALID, company: 'شركة المثال' })).toEqual([]);
  });

  it.each([
    ['an empty company', { company: '' }, 'company'],
    ['a company of spaces', { company: '   ' }, 'company'],
    ['a line break, which would reach the mail subject', { company: 'A\nBcc: x' }, 'company'],
    ['a company too long', { company: 'x'.repeat(151) }, 'company'],
    ['a phone with letters', { phone: 'call me' }, 'phone'],
    ['a phone too short', { phone: '123' }, 'phone'],
    ['an unknown kind', { kind: 'castle' }, 'kind'],
    ['an unknown language', { locale: 'en' }, 'locale'],
  ])('refuses %s', (_label, change, field) => {
    expect(invalid({ ...VALID, ...change })).toEqual([field]);
  });
});
