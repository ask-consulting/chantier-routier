import { ConfigService } from '@nestjs/config';
import { UserRole } from '@chantia/shared';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { beforeEach, describe, expect, it } from 'vitest';
import { RefreshToken } from '../domain/entities/refresh-token.entity';
import { User } from '../domain/entities/user.entity';
import {
  InvalidCredentialsException,
  LastAdminException,
  SelfTargetedActionException,
  WeakPasswordException,
} from '../domain/exceptions/identity.exceptions';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import { RefreshTokenRepositoryPort } from '../domain/ports/refresh-token-repository.port';
import { TokenIssuerPort } from '../domain/ports/token-issuer.port';
import { UserRepositoryPort } from '../domain/ports/user-repository.port';
import { ChangePasswordCommand } from './commands/change-password.command';
import { ChangePasswordHandler } from './commands/change-password.handler';
import { DeleteUserCommand } from './commands/delete-user.command';
import { DeleteUserHandler } from './commands/delete-user.handler';
import { LogoutCommand } from './commands/logout.command';
import { LogoutHandler } from './commands/logout.handler';

/**
 * What a signed-in person does to an account once they are in: change their
 * password, end their sessions, delete someone else's account. The guard that
 * re-reads the account before any of it is in `fresh-account.guard.spec.ts`.
 *
 * Same method as `auth-flow.spec.ts`: the real handlers over dumb in-memory
 * doubles. Each refusal is the point; the comments say what it protects.
 */

const ORG = 'org-1';
const PASSWORD = 'Correct-Horse-42!';
const NEW_PASSWORD = 'Battery-Staple-77?';

class FakePasswordHasher implements PasswordHasherPort {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(plain: string, encoded: string): Promise<boolean> {
    return `hashed:${plain}` === encoded;
  }

  async simulateVerify(): Promise<void> {}
}

class FakeTokenIssuer implements Pick<TokenIssuerPort, 'hashToken'> {
  hashToken(token: string): string {
    return `sha256:${token}`;
  }
}

class InMemoryUsers implements UserRepositoryPort {
  readonly rows = new Map<string, User>();

  async findByEmail(email: string): Promise<User | null> {
    return [...this.rows.values()].find((u) => u.email === email) ?? null;
  }

  async findById(id: string): Promise<User | null> {
    return this.rows.get(id) ?? null;
  }

  async findByWorkerId(): Promise<User | null> {
    return null;
  }

  async search(): Promise<never> {
    throw new Error('not used here');
  }

  async countActiveAdmins(): Promise<number> {
    return [...this.rows.values()].filter((u) => u.active && u.role === UserRole.ADMIN).length;
  }

  async save(user: User): Promise<User> {
    this.rows.set(user.id, user);
    return user;
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id);
  }
}

class InMemoryRefreshTokens implements RefreshTokenRepositoryPort {
  readonly rows = new Map<string, RefreshToken>();

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return [...this.rows.values()].find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    this.rows.set(token.id, token);
    return token;
  }

  async revokeAllForUser(userId: string, at: Date = new Date()): Promise<void> {
    for (const [id, token] of this.rows) {
      if (token.userId === userId && !token.isRevoked()) {
        this.rows.set(id, token.revoke(null, at));
      }
    }
  }

  async deleteExpired(): Promise<number> {
    return 0;
  }

  live(userId: string): RefreshToken[] {
    return [...this.rows.values()].filter((t) => t.userId === userId && t.isUsable());
  }
}

function setup() {
  const users = new InMemoryUsers();
  const refreshTokens = new InMemoryRefreshTokens();
  const hasher = new FakePasswordHasher();
  const tokenIssuer = new FakeTokenIssuer() as unknown as TokenIssuerPort;
  const config = { getOrThrow: () => ({ minPasswordLength: 12 }) } as unknown as ConfigService;

  return {
    users,
    refreshTokens,
    changePassword: new ChangePasswordHandler(users, hasher, refreshTokens, config),
    logout: new LogoutHandler(refreshTokens, tokenIssuer),
    deleteUser: new DeleteUserHandler(users),
  };
}

type Harness = ReturnType<typeof setup>;

function anAccount(
  h: Harness,
  overrides: Partial<{
    id: string;
    role: UserRole;
    active: boolean;
    passwordHash: string | null;
  }> = {},
): User {
  const user = User.create({
    id: overrides.id ?? 'user-1',
    organizationId: ORG,
    email: `${overrides.id ?? 'user-1'}@chantier.fr`,
    passwordHash:
      overrides.passwordHash === undefined ? `hashed:${PASSWORD}` : overrides.passwordHash,
    firstName: 'Amine',
    lastName: 'Ben Salah',
    role: overrides.role ?? UserRole.SITE_MANAGER,
    active: overrides.active ?? true,
  });
  h.users.rows.set(user.id, user);
  return user;
}

function aSession(h: Harness, id: string, userId = 'user-1'): RefreshToken {
  const token = RefreshToken.issue({
    id,
    userId,
    tokenHash: `sha256:${id}`,
    expiresAt: new Date(Date.now() + 60_000),
  });
  h.refreshTokens.rows.set(id, token);
  return token;
}

describe('changing your own password', () => {
  let h: Harness;
  beforeEach(() => {
    h = setup();
  });

  it('stores the new hash and closes every session, this one included', async () => {
    anAccount(h);
    aSession(h, 'laptop');
    aSession(h, 'phone');

    await h.changePassword.execute(
      new ChangePasswordCommand('user-1', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD }),
    );

    expect(h.users.rows.get('user-1')?.passwordHash).toBe(`hashed:${NEW_PASSWORD}`);
    expect(h.refreshTokens.live('user-1')).toHaveLength(0);
  });

  it('asks for the current password, so a borrowed session cannot take the account', async () => {
    anAccount(h);
    aSession(h, 'laptop');

    await expect(
      h.changePassword.execute(
        new ChangePasswordCommand('user-1', {
          currentPassword: 'not-the-password',
          newPassword: NEW_PASSWORD,
        }),
      ),
    ).rejects.toThrow(InvalidCredentialsException);
    expect(h.users.rows.get('user-1')?.passwordHash).toBe(`hashed:${PASSWORD}`);
    expect(h.refreshTokens.live('user-1')).toHaveLength(1);
  });

  it('answers an account deleted mid-session like a wrong password', async () => {
    await expect(
      h.changePassword.execute(
        new ChangePasswordCommand('ghost', { currentPassword: PASSWORD, newPassword: NEW_PASSWORD }),
      ),
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('fails closed on an account that has no password yet', async () => {
    anAccount(h, { passwordHash: null });

    await expect(
      h.changePassword.execute(
        new ChangePasswordCommand('user-1', { currentPassword: '', newPassword: NEW_PASSWORD }),
      ),
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('applies the password policy, and changes nothing when it refuses', async () => {
    anAccount(h);
    aSession(h, 'laptop');

    await expect(
      h.changePassword.execute(
        new ChangePasswordCommand('user-1', { currentPassword: PASSWORD, newPassword: 'short' }),
      ),
    ).rejects.toThrow(WeakPasswordException);
    expect(h.users.rows.get('user-1')?.passwordHash).toBe(`hashed:${PASSWORD}`);
    expect(h.refreshTokens.live('user-1')).toHaveLength(1);
  });

  it('refuses a new password built from the person own name', async () => {
    anAccount(h);

    await expect(
      h.changePassword.execute(
        new ChangePasswordCommand('user-1', {
          currentPassword: PASSWORD,
          newPassword: 'Amine-Chantier-2026!',
        }),
      ),
    ).rejects.toThrow(WeakPasswordException);
  });
});

describe('logging out', () => {
  let h: Harness;
  beforeEach(() => {
    h = setup();
  });

  it('ends the one session it is given, and leaves the others', async () => {
    aSession(h, 'laptop');
    aSession(h, 'phone');

    await h.logout.execute(new LogoutCommand('user-1', 'laptop'));

    expect(h.refreshTokens.live('user-1').map((t) => t.id)).toEqual(['phone']);
  });

  it('ends every session when no token is given — the lost-phone case', async () => {
    aSession(h, 'laptop');
    aSession(h, 'phone');

    await h.logout.execute(new LogoutCommand('user-1', null));

    expect(h.refreshTokens.live('user-1')).toHaveLength(0);
  });

  it("will not end someone else's session, even holding their token", async () => {
    aSession(h, 'their-laptop', 'user-2');

    await h.logout.execute(new LogoutCommand('user-1', 'their-laptop'));

    expect(h.refreshTokens.live('user-2')).toHaveLength(1);
  });

  it('succeeds silently on a token it has never issued', async () => {
    // Reporting "unknown token" would let anyone probe the token store.
    await expect(h.logout.execute(new LogoutCommand('user-1', 'made-up'))).resolves.toBeUndefined();
  });

  it('does not touch a session already ended', async () => {
    const ended = aSession(h, 'laptop').revoke(null, new Date('2026-01-01'));
    h.refreshTokens.rows.set('laptop', ended);

    await h.logout.execute(new LogoutCommand('user-1', 'laptop'));

    expect(h.refreshTokens.rows.get('laptop')?.revokedAt).toEqual(new Date('2026-01-01'));
  });
});

describe('deleting an account', () => {
  let h: Harness;
  beforeEach(() => {
    h = setup();
  });

  it('removes the account', async () => {
    anAccount(h, { id: 'admin', role: UserRole.ADMIN });
    anAccount(h, { id: 'user-1' });

    await h.deleteUser.execute(new DeleteUserCommand('user-1', 'admin'));

    expect(h.users.rows.has('user-1')).toBe(false);
  });

  it('refuses to delete your own account', async () => {
    anAccount(h, { id: 'admin', role: UserRole.ADMIN });
    anAccount(h, { id: 'admin-2', role: UserRole.ADMIN });

    await expect(h.deleteUser.execute(new DeleteUserCommand('admin', 'admin'))).rejects.toThrow(
      SelfTargetedActionException,
    );
    expect(h.users.rows.has('admin')).toBe(true);
  });

  it('answers not found for an account it cannot see — another tenant looks the same', async () => {
    await expect(h.deleteUser.execute(new DeleteUserCommand('elsewhere', 'admin'))).rejects.toThrow(
      ResourceNotFoundException,
    );
  });

  it('refuses to delete the last active administrator', async () => {
    // Reachable when the acting admin is the platform, or has just been demoted
    // in another tab: the organization would be left with nobody to manage it.
    anAccount(h, { id: 'last-admin', role: UserRole.ADMIN });
    anAccount(h, { id: 'retired-admin', role: UserRole.ADMIN, active: false });

    await expect(
      h.deleteUser.execute(new DeleteUserCommand('last-admin', 'someone')),
    ).rejects.toThrow(LastAdminException);
    expect(h.users.rows.has('last-admin')).toBe(true);
  });

  it('lets an inactive administrator go — it was not counted as one', async () => {
    anAccount(h, { id: 'admin', role: UserRole.ADMIN });
    anAccount(h, { id: 'retired-admin', role: UserRole.ADMIN, active: false });

    await h.deleteUser.execute(new DeleteUserCommand('retired-admin', 'admin'));

    expect(h.users.rows.has('retired-admin')).toBe(false);
  });

  it('lets one of two administrators go', async () => {
    anAccount(h, { id: 'admin', role: UserRole.ADMIN });
    anAccount(h, { id: 'admin-2', role: UserRole.ADMIN });

    await h.deleteUser.execute(new DeleteUserCommand('admin-2', 'admin'));

    expect(h.users.rows.has('admin-2')).toBe(false);
  });
});
