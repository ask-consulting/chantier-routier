import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '@chantia/shared';
import { User } from '../../domain/entities/user.entity';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { RefreshTokenRepositoryPort } from '../../domain/ports/refresh-token-repository.port';
import {
  LastAdminException,
  SelfTargetedActionException,
} from '../../infrastructure/exceptions/identity.exceptions';
import { UpdateUserCommand } from './update-user.command';
import { UpdateUserHandler } from './update-user.handler';

const ORG = 'org-1';

function aUser(overrides: Partial<{ id: string; role: UserRole; active: boolean }> = {}): User {
  return User.create({
    id: overrides.id ?? 'user-1',
    organizationId: ORG,
    email: 'someone@example.test',
    passwordHash: 'scrypt$…',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: overrides.role ?? UserRole.ADMIN,
    active: overrides.active ?? true,
  });
}

function build(user: User, activeAdmins = 2) {
  const users = {
    findById: vi.fn().mockResolvedValue(user),
    save: vi.fn().mockImplementation((u: User) => Promise.resolve(u)),
    countActiveAdmins: vi.fn().mockResolvedValue(activeAdmins),
  } as unknown as UserRepositoryPort;

  const refreshTokens = {
    revokeAllForUser: vi.fn().mockResolvedValue(undefined),
  } as unknown as RefreshTokenRepositoryPort;

  return { handler: new UpdateUserHandler(users, refreshTokens), users, refreshTokens };
}

describe('UpdateUserHandler — acting on your own account', () => {
  /**
   * The regression this file exists for. The guard used to read "you cannot
   * demote yourself", which was only safe while `USER_MANAGE` belonged to admins
   * alone: granting that permission to another role would have turned this route
   * into self-promotion, with nothing in this file changing.
   */
  it('refuses a self-promotion, whatever role the caller currently holds', async () => {
    const siteManager = aUser({ id: 'me', role: UserRole.SITE_MANAGER });
    const { handler } = build(siteManager);

    await expect(
      handler.execute(new UpdateUserCommand('me', { role: UserRole.ADMIN }, 'me')),
    ).rejects.toBeInstanceOf(SelfTargetedActionException);
  });

  it('refuses a self-demotion', async () => {
    const { handler } = build(aUser({ id: 'me', role: UserRole.ADMIN }));

    await expect(
      handler.execute(new UpdateUserCommand('me', { role: UserRole.WORKER }, 'me')),
    ).rejects.toBeInstanceOf(SelfTargetedActionException);
  });

  it('refuses a self-deactivation', async () => {
    const { handler } = build(aUser({ id: 'me' }));

    await expect(
      handler.execute(new UpdateUserCommand('me', { active: false }, 'me')),
    ).rejects.toBeInstanceOf(SelfTargetedActionException);
  });

  it('accepts re-sending the role you already hold — a full-object PATCH is not a change', async () => {
    const { handler } = build(aUser({ id: 'me', role: UserRole.ADMIN }));

    const updated = await handler.execute(
      new UpdateUserCommand('me', { role: UserRole.ADMIN, firstName: 'Augusta' }, 'me'),
    );
    expect(updated.firstName).toBe('Augusta');
  });

  it('accepts editing your own profile', async () => {
    const { handler } = build(aUser({ id: 'me' }));

    const updated = await handler.execute(
      new UpdateUserCommand('me', { firstName: 'Augusta' }, 'me'),
    );
    expect(updated.firstName).toBe('Augusta');
  });
});

describe('UpdateUserHandler — acting on somebody else', () => {
  it('lets an admin promote another account', async () => {
    const { handler } = build(aUser({ id: 'other', role: UserRole.FOREMAN }));

    const updated = await handler.execute(
      new UpdateUserCommand('other', { role: UserRole.ADMIN }, 'me'),
    );
    expect(updated.role).toBe(UserRole.ADMIN);
  });

  it('refuses to demote the last active admin', async () => {
    const { handler } = build(aUser({ id: 'other', role: UserRole.ADMIN }), 1);

    await expect(
      handler.execute(new UpdateUserCommand('other', { role: UserRole.WORKER }, 'me')),
    ).rejects.toBeInstanceOf(LastAdminException);
  });

  it('refuses to deactivate the last active admin', async () => {
    const { handler } = build(aUser({ id: 'other', role: UserRole.ADMIN }), 1);

    await expect(
      handler.execute(new UpdateUserCommand('other', { active: false }, 'me')),
    ).rejects.toBeInstanceOf(LastAdminException);
  });

  it('revokes the sessions of an account it deactivates', async () => {
    const { handler, refreshTokens } = build(aUser({ id: 'other', role: UserRole.WORKER }));

    await handler.execute(new UpdateUserCommand('other', { active: false }, 'me'));
    expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith('other');
  });
});
