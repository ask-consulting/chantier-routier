import { DEFAULT_LOCALE, UserRole } from '@chantia/shared';
import { ConfigService } from '@nestjs/config';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { describe, expect, it, vi } from 'vitest';
import { Invitation } from '../domain/entities/invitation.entity';
import { Organization } from '../domain/entities/organization.entity';
import { User } from '../domain/entities/user.entity';
import {
  EmailAlreadyUsedException,
  InvalidInvitationException,
  RegistrationClosedException,
  WeakPasswordException,
} from '../domain/exceptions/identity.exceptions';
import { InvitationRepositoryPort } from '../domain/ports/invitation-repository.port';
import { OrganizationRepositoryPort } from '../domain/ports/organization-repository.port';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import { TokenIssuerPort } from '../domain/ports/token-issuer.port';
import { UserRepositoryPort } from '../domain/ports/user-repository.port';
import { RegisterCommand } from './commands/register.command';
import { RegisterHandler } from './commands/register.handler';
import { UpdatePreferencesCommand } from './commands/update-preferences.command';
import { UpdatePreferencesHandler } from './commands/update-preferences.handler';
import { GetInvitationHandler } from './queries/get-invitation.handler';
import { GetInvitationQuery } from './queries/get-invitation.query';
import { GetUserByIdHandler } from './queries/get-user-by-id.handler';
import { GetUserByIdQuery } from './queries/get-user-by-id.query';
import { SessionIssuer } from './services/session-issuer.service';

/**
 * The flows a visitor or a signed-in person reaches on their own: closed
 * sign-up, the invitation preview, their own profile.
 */

const anAccount = (overrides: Partial<{ active: boolean; email: string }> = {}): User =>
  User.create({
    id: 'user-1',
    organizationId: 'org-1',
    email: overrides.email ?? 'chef@chantier.fr',
    passwordHash: 'hashed',
    firstName: 'Amine',
    lastName: 'Ben Salah',
    role: UserRole.FOREMAN,
    active: overrides.active ?? true,
  });

function usersWith(...accounts: User[]) {
  const rows = new Map(accounts.map((user) => [user.id, user]));
  return {
    rows,
    port: {
      findById: async (id: string) => rows.get(id) ?? null,
      findByEmail: async (email: string) =>
        [...rows.values()].find((user) => user.email === email) ?? null,
      save: async (user: User) => {
        rows.set(user.id, user);
        return user;
      },
    } as unknown as UserRepositoryPort,
  };
}

describe('registering', () => {
  const REQUEST = {
    organizationName: 'Travaux du Sud',
    email: ' Patron@Chantier.FR ',
    password: 'Correct-Horse-42!',
    firstName: 'Amine',
    lastName: 'Ben Salah',
  };

  function setup(allowSelfRegistration: boolean, ...accounts: User[]) {
    const createWithOwner = vi.fn(async (organization: Organization, owner: User) => ({
      organization,
      owner,
    }));
    const issueFor = vi.fn(async () => ({ accessToken: 'token' }));
    const handler = new RegisterHandler(
      { createWithOwner } as unknown as OrganizationRepositoryPort,
      usersWith(...accounts).port,
      { hash: async (plain: string) => `hashed:${plain}` } as unknown as PasswordHasherPort,
      { issueFor } as unknown as SessionIssuer,
      {
        getOrThrow: () => ({ allowSelfRegistration, minPasswordLength: 12 }),
      } as unknown as ConfigService,
    );
    return { handler, createWithOwner, issueFor };
  }

  it('is closed unless explicitly opened', async () => {
    const { handler, createWithOwner } = setup(false);

    await expect(handler.execute(new RegisterCommand(REQUEST, null))).rejects.toThrow(
      RegistrationClosedException,
    );
    expect(createWithOwner).not.toHaveBeenCalled();
  });

  it('applies the password policy', async () => {
    await expect(
      setup(true).handler.execute(new RegisterCommand({ ...REQUEST, password: 'short' }, null)),
    ).rejects.toThrow(WeakPasswordException);
  });

  it('refuses an address already in use, in any casing', async () => {
    await expect(
      setup(true, anAccount({ email: 'patron@chantier.fr' })).handler.execute(
        new RegisterCommand(REQUEST, null),
      ),
    ).rejects.toThrow(EmailAlreadyUsedException);
  });

  it('makes the first account an admin of the new organization, and signs them in', async () => {
    const { handler, createWithOwner, issueFor } = setup(true);

    await handler.execute(new RegisterCommand(REQUEST, 'Safari'));

    const [organization, owner] = createWithOwner.mock.calls[0];
    expect(organization.name).toBe('Travaux du Sud');
    expect(owner).toMatchObject({
      organizationId: organization.id,
      email: 'patron@chantier.fr',
      role: UserRole.ADMIN,
      passwordHash: `hashed:${REQUEST.password}`,
    });
    expect(issueFor).toHaveBeenCalledWith(owner, { userAgent: 'Safari' });
  });
});

describe('previewing an invitation', () => {
  const invitation = (expiresAt: Date, acceptedAt: Date | null = null) =>
    new Invitation('inv-1', 'user-1', 'sha256:token', expiresAt, acceptedAt, null);
  const FUTURE = new Date(Date.now() + 60_000);

  function preview(found: Invitation | null, organizationName: string | null, ...users: User[]) {
    return new GetInvitationHandler(
      { findByTokenHash: async () => found } as unknown as InvitationRepositoryPort,
      usersWith(...users).port,
      {
        findById: async () =>
          organizationName ? Organization.create({ id: 'org-1', name: organizationName }) : null,
      } as unknown as OrganizationRepositoryPort,
      { hashToken: (token: string) => `sha256:${token}` } as unknown as TokenIssuerPort,
    ).execute(new GetInvitationQuery('token'));
  }

  it('shows the invitee their own name and organization, and nothing else', async () => {
    await expect(preview(invitation(FUTURE), 'Travaux du Sud', anAccount())).resolves.toEqual({
      firstName: 'Amine',
      lastName: 'Ben Salah',
      email: 'chef@chantier.fr',
      organizationName: 'Travaux du Sud',
    });
  });

  it('still answers when the organization cannot be read', async () => {
    await expect(preview(invitation(FUTURE), null, anAccount())).resolves.toMatchObject({
      organizationName: '',
    });
  });

  it.each([
    ['an unknown token', () => preview(null, 'X', anAccount())],
    ['an expired link', () => preview(invitation(new Date(0)), 'X', anAccount())],
    ['a link already used', () => preview(invitation(FUTURE, new Date()), 'X', anAccount())],
    ['a deleted account', () => preview(invitation(FUTURE), 'X')],
    ['a disabled account', () => preview(invitation(FUTURE), 'X', anAccount({ active: false }))],
  ])('gives the same refusal for %s', async (_label, attempt) => {
    await expect(attempt()).rejects.toThrow(InvalidInvitationException);
  });
});

describe('the account itself', () => {
  it('reads an account', async () => {
    const account = anAccount();

    await expect(
      new GetUserByIdHandler(usersWith(account).port).execute(new GetUserByIdQuery('user-1')),
    ).resolves.toBe(account);
  });

  it('answers not found for an account it cannot see', async () => {
    await expect(
      new GetUserByIdHandler(usersWith().port).execute(new GetUserByIdQuery('elsewhere')),
    ).rejects.toThrow(ResourceNotFoundException);
  });

  it('stores the language a person chooses', async () => {
    const users = usersWith(anAccount());

    await new UpdatePreferencesHandler(users.port).execute(
      new UpdatePreferencesCommand('user-1', DEFAULT_LOCALE),
    );

    expect(users.rows.get('user-1')?.locale).toBe(DEFAULT_LOCALE);
  });

  it('does not create preferences for an absent account', async () => {
    await expect(
      new UpdatePreferencesHandler(usersWith().port).execute(
        new UpdatePreferencesCommand('elsewhere', DEFAULT_LOCALE),
      ),
    ).rejects.toThrow(ResourceNotFoundException);
  });
});
