import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '@chantia/shared';
import { AUTH_USER_KEY } from '@shared/auth';
import { describe, expect, it } from 'vitest';
import { User } from '../../domain/entities/user.entity';
import { AccountDisabledException } from '../../domain/exceptions/identity.exceptions';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { FreshAccountGuard } from './fresh-account.guard';

/**
 * The guard that re-reads the account before anyone grants or changes access.
 * The token is a photograph; this is the one place the database gets a say.
 */

function guardOver(...accounts: User[]): FreshAccountGuard {
  const rows = new Map(accounts.map((user) => [user.id, user]));
  return new FreshAccountGuard({
    findById: async (id: string) => rows.get(id) ?? null,
  } as unknown as UserRepositoryPort);
}

function anAccount(active: boolean, passwordHash: string | null = 'hashed'): User {
  return User.create({
    id: 'user-1',
    organizationId: 'org-1',
    email: 'admin@chantier.fr',
    passwordHash,
    firstName: 'Amine',
    lastName: 'Ben Salah',
    role: UserRole.ADMIN,
    active,
  });
}

const contextFor = (caller?: { id: string }) =>
  ({
    switchToHttp: () => ({ getRequest: () => (caller ? { [AUTH_USER_KEY]: caller } : {}) }),
  }) as unknown as ExecutionContext;

describe('FreshAccountGuard', () => {
  it('lets an active account through', async () => {
    await expect(guardOver(anAccount(true)).canActivate(contextFor({ id: 'user-1' }))).resolves.toBe(
      true,
    );
  });

  it('refuses an account deactivated since its token was issued', async () => {
    // The token still says "admin"; the database says otherwise. Granting
    // access from inside that window would outlive the token.
    await expect(
      guardOver(anAccount(false)).canActivate(contextFor({ id: 'user-1' })),
    ).rejects.toThrow(AccountDisabledException);
  });

  it('refuses an account deleted since its token was issued', async () => {
    await expect(guardOver().canActivate(contextFor({ id: 'user-1' }))).rejects.toThrow(
      AccountDisabledException,
    );
  });

  it('refuses an account that cannot authenticate, whatever its flag says', async () => {
    await expect(
      guardOver(anAccount(true, null)).canActivate(contextFor({ id: 'user-1' })),
    ).rejects.toThrow(AccountDisabledException);
  });

  it('has nothing to check on a public route', async () => {
    await expect(guardOver().canActivate(contextFor())).resolves.toBe(true);
  });
});
