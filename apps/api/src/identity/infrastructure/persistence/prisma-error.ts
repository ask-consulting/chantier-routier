import { Prisma } from '@prisma/client';

/** Prisma's code for "unique constraint failed". */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * True when the write lost a race on a unique index covering `field`.
 *
 * Checking uniqueness with a `SELECT` before inserting is a check-then-act race:
 * two concurrent sign-ups on the same email both see "free" and both insert. The
 * database index is the only real arbiter, so the pre-check stays for the nice
 * error message and this translates the constraint violation that settles it.
 */
export function isUniqueViolationOn(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== UNIQUE_CONSTRAINT_VIOLATION) {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes(field);
  }
  return typeof target === 'string' && target.includes(field);
}
