import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { isUniqueViolationOn } from './prisma-error';

const known = (code: string, target?: unknown) =>
  new Prisma.PrismaClientKnownRequestError('failed', {
    code,
    clientVersion: 'test',
    meta: { target },
  });

describe('isUniqueViolationOn', () => {
  it('recognises the column in a list of targets', () => {
    expect(isUniqueViolationOn(known('P2002', ['email']), 'email')).toBe(true);
  });

  it('recognises the column in an index name', () => {
    expect(isUniqueViolationOn(known('P2002', 'uq_app_users_email'), 'email')).toBe(true);
  });

  it.each([
    ['another column', known('P2002', ['phone'])],
    ['another Prisma error', known('P2025', ['email'])],
    ['a violation with no target', known('P2002')],
    ['any other error', new Error('email')],
  ])('is false for %s', (_label, error) => {
    expect(isUniqueViolationOn(error, 'email')).toBe(false);
  });
});
