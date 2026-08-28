import { ConfigService } from '@nestjs/config';
import { UserRole } from '@chantia/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Invitation } from '../domain/entities/invitation.entity';
import { RefreshToken } from '../domain/entities/refresh-token.entity';
import { User } from '../domain/entities/user.entity';
import { InvitationRepositoryPort } from '../domain/ports/invitation-repository.port';
import { PasswordHasherPort } from '../domain/ports/password-hasher.port';
import { RefreshTokenRepositoryPort } from '../domain/ports/refresh-token-repository.port';
import { IssuedOpaqueToken, TokenIssuerPort } from '../domain/ports/token-issuer.port';
import { UserRepositoryPort } from '../domain/ports/user-repository.port';
import {
  AccountDisabledException,
  InvalidCredentialsException,
  InvalidInvitationException,
  InvalidRefreshTokenException,
  WeakPasswordException,
} from '../domain/exceptions/identity.exceptions';
import { AcceptInvitationCommand } from './commands/accept-invitation.command';
import { AcceptInvitationHandler } from './commands/accept-invitation.handler';
import { LoginCommand } from './commands/login.command';
import { LoginHandler } from './commands/login.handler';
import { RefreshSessionCommand } from './commands/refresh-session.command';
import { RefreshSessionHandler } from './commands/refresh-session.handler';
import { SessionIssuer } from './services/session-issuer.service';

/**
 * The authentication journey, end to end: sign in, rotate, detect a stolen
 * token, accept an invitation.
 *
 * Until now every API test here covered a hole found after the fact — a
 * privilege escalation, a budget leak, the rate limiter. The journey itself,
 * which is the product's front door, was covered by nothing at all.
 *
 * These run the real handlers over in-memory doubles of the five ports. The
 * doubles are dumb on purpose: the behaviour under test is the handlers'
 * ordering and their refusals, and a clever fake would end up asserting itself.
 * What each *refusal* deliberately hides is the recurring theme, because that is
 * the part a later reader is most likely to "simplify" away.
 */

const ORG = 'org-1';
const PASSWORD = 'Correct-Horse-42!';

class FakePasswordHasher implements PasswordHasherPort {
  readonly simulateVerify = vi.fn(async () => {});

  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(plain: string, encoded: string): Promise<boolean> {
    return `hashed:${plain}` === encoded;
  }
}

class FakeTokenIssuer implements TokenIssuerPort {
  private counter = 0;

  async issueAccessToken(): Promise<{ token: string; expiresIn: number }> {
    return { token: `access-${++this.counter}`, expiresIn: 300 };
  }

  issueRefreshToken(): IssuedOpaqueToken {
    return this.mint('refresh', 60_000);
  }

  issueInvitationToken(): IssuedOpaqueToken {
    return this.mint('invitation', 600_000);
  }

  hashToken(token: string): string {
    return `sha256:${token}`;
  }

  private mint(prefix: string, ttlMs: number): IssuedOpaqueToken {
    const token = `${prefix}-${++this.counter}`;
    return { token, tokenHash: this.hashToken(token), expiresAt: new Date(Date.now() + ttlMs) };
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

  async save(user: User): Promise<User> {
    this.rows.set(user.id, user);
    return user;
  }

  async countActiveAdmins(): Promise<number> {
    return [...this.rows.values()].filter((u) => u.active && u.role === UserRole.ADMIN).length;
  }

  async search(): Promise<never> {
    throw new Error('not used by the authentication journey');
  }

  async delete(id: string): Promise<void> {
    this.rows.delete(id);
  }
}

class InMemoryRefreshTokens implements RefreshTokenRepositoryPort {
  readonly rows = new Map<string, RefreshToken>();
  /** Every save, in order — the rotation's ordering is part of the contract. */
  readonly writes: RefreshToken[] = [];

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return [...this.rows.values()].find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async save(token: RefreshToken): Promise<RefreshToken> {
    this.rows.set(token.id, token);
    this.writes.push(token);
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

class InMemoryInvitations implements InvitationRepositoryPort {
  readonly rows = new Map<string, Invitation>();

  async findByTokenHash(tokenHash: string): Promise<Invitation | null> {
    return [...this.rows.values()].find((i) => i.tokenHash === tokenHash) ?? null;
  }

  async save(invitation: Invitation): Promise<Invitation> {
    this.rows.set(invitation.id, invitation);
    return invitation;
  }

  async revokeOutstandingFor(): Promise<void> {}

  async deleteExpired(): Promise<number> {
    return 0;
  }
}

function setup() {
  const users = new InMemoryUsers();
  const refreshTokens = new InMemoryRefreshTokens();
  const invitations = new InMemoryInvitations();
  const hasher = new FakePasswordHasher();
  const tokenIssuer = new FakeTokenIssuer();
  const sessionIssuer = new SessionIssuer(tokenIssuer, refreshTokens);

  const config = {
    getOrThrow: () => ({ minPasswordLength: 12 }),
  } as unknown as ConfigService;

  return {
    users,
    refreshTokens,
    invitations,
    hasher,
    tokenIssuer,
    login: new LoginHandler(users, hasher, sessionIssuer),
    refresh: new RefreshSessionHandler(refreshTokens, users, tokenIssuer, sessionIssuer),
    accept: new AcceptInvitationHandler(
      invitations,
      users,
      hasher,
      tokenIssuer,
      sessionIssuer,
      config,
    ),
  };
}

type Harness = ReturnType<typeof setup>;

function anAccount(
  harness: Harness,
  overrides: Partial<{ active: boolean; passwordHash: string | null; email: string }> = {},
): User {
  const user = User.create({
    id: 'user-1',
    organizationId: ORG,
    email: overrides.email ?? 'chef@chantier.fr',
    passwordHash:
      overrides.passwordHash === undefined ? `hashed:${PASSWORD}` : overrides.passwordHash,
    firstName: 'Amine',
    lastName: 'Ben Salah',
    role: UserRole.SITE_MANAGER,
    active: overrides.active ?? true,
  });
  harness.users.rows.set(user.id, user);
  return user;
}

describe('signing in', () => {
  let h: Harness;
  beforeEach(() => {
    h = setup();
  });

  it('issues a session and records the visit', async () => {
    anAccount(h);

    const session = await h.login.execute(
      new LoginCommand({ email: 'chef@chantier.fr', password: PASSWORD }, 'Safari'),
    );

    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.expiresIn).toBe(300);
    expect(h.users.rows.get('user-1')?.lastLoginAt).toBeInstanceOf(Date);
    expect(h.refreshTokens.live('user-1')).toHaveLength(1);
  });

  it('accepts the address in any casing it was typed', async () => {
    anAccount(h);

    const session = await h.login.execute(
      new LoginCommand({ email: '  CHEF@Chantier.FR ', password: PASSWORD }, null),
    );

    expect(session.user.id).toBe('user-1');
  });

  it('refuses a wrong password', async () => {
    anAccount(h);

    await expect(
      h.login.execute(new LoginCommand({ email: 'chef@chantier.fr', password: 'wrong' }, null)),
    ).rejects.toThrow(InvalidCredentialsException);
  });

  /**
   * Returning early on an unknown address makes it measurably faster than a
   * wrong password, which is the whole signal an enumeration probe needs. The
   * handler burns the same CPU instead — and that only holds while this call
   * is actually made.
   */
  it('burns the same work on an unknown address as on a wrong password', async () => {
    await expect(
      h.login.execute(new LoginCommand({ email: 'nobody@chantier.fr', password: PASSWORD }, null)),
    ).rejects.toThrow(InvalidCredentialsException);

    expect(h.hasher.simulateVerify).toHaveBeenCalledOnce();
  });

  /**
   * An invited account that never accepted exists and carries a role, but has
   * no password. Answering anything other than "invalid credentials" would
   * confirm the address to whoever is probing.
   */
  it('treats an invited-but-never-accepted account exactly like an unknown one', async () => {
    anAccount(h, { passwordHash: null });

    await expect(
      h.login.execute(new LoginCommand({ email: 'chef@chantier.fr', password: PASSWORD }, null)),
    ).rejects.toThrow(InvalidCredentialsException);

    expect(h.hasher.simulateVerify).toHaveBeenCalledOnce();
  });

  it('tells a disabled account so, once it has proved who it is', async () => {
    anAccount(h, { active: false });

    await expect(
      h.login.execute(new LoginCommand({ email: 'chef@chantier.fr', password: PASSWORD }, null)),
    ).rejects.toThrow(AccountDisabledException);
  });

  /**
   * The order of the two checks is the point. Were `active` tested before the
   * password, anyone could learn which addresses are disabled accounts without
   * knowing a single password.
   */
  it('does not reveal that a disabled account exists to someone guessing', async () => {
    anAccount(h, { active: false });

    await expect(
      h.login.execute(new LoginCommand({ email: 'chef@chantier.fr', password: 'wrong' }, null)),
    ).rejects.toThrow(InvalidCredentialsException);
  });

  it('leaves no session behind when it refuses', async () => {
    anAccount(h, { active: false });

    await expect(
      h.login.execute(new LoginCommand({ email: 'chef@chantier.fr', password: PASSWORD }, null)),
    ).rejects.toThrow();

    expect(h.refreshTokens.rows.size).toBe(0);
  });
});

describe('rotating a session', () => {
  let h: Harness;
  beforeEach(() => {
    h = setup();
  });

  async function signIn(): Promise<string> {
    anAccount(h);
    const session = await h.login.execute(
      new LoginCommand({ email: 'chef@chantier.fr', password: PASSWORD }, null),
    );
    return session.refreshToken;
  }

  it('hands back a different token and retires the old one', async () => {
    const first = await signIn();

    const session = await h.refresh.execute(new RefreshSessionCommand(first, null));

    expect(session.refreshToken).not.toBe(first);
    expect(h.refreshTokens.live('user-1')).toHaveLength(1);
  });

  it('links the retired token to its replacement, so a family can be traced', async () => {
    const first = await signIn();

    const session = await h.refresh.execute(new RefreshSessionCommand(first, null));

    const retired = await h.refreshTokens.findByTokenHash(h.tokenIssuer.hashToken(first));
    const issued = await h.refreshTokens.findByTokenHash(
      h.tokenIssuer.hashToken(session.refreshToken),
    );
    expect(retired?.isRevoked()).toBe(true);
    expect(retired?.replacedBy).toBe(issued?.id);
  });

  /**
   * The replacement is persisted before the old one is revoked. If that write
   * order flipped and the second failed, the client would be left holding two
   * dead tokens and no way back in.
   */
  it('persists the replacement before revoking what it replaces', async () => {
    const first = await signIn();
    h.refreshTokens.writes.length = 0;

    await h.refresh.execute(new RefreshSessionCommand(first, null));

    expect(h.refreshTokens.writes).toHaveLength(2);
    expect(h.refreshTokens.writes[0].isRevoked()).toBe(false);
    expect(h.refreshTokens.writes[1].isRevoked()).toBe(true);
  });

  it('refuses a token it has never issued', async () => {
    await signIn();

    await expect(
      h.refresh.execute(new RefreshSessionCommand('made-up', null)),
    ).rejects.toThrow(InvalidRefreshTokenException);
  });

  it('refuses an expired token', async () => {
    anAccount(h);
    await h.refreshTokens.save(
      RefreshToken.issue({
        id: 'stale',
        userId: 'user-1',
        tokenHash: h.tokenIssuer.hashToken('yesterday'),
        expiresAt: new Date(Date.now() - 1),
      }),
    );

    await expect(
      h.refresh.execute(new RefreshSessionCommand('yesterday', null)),
    ).rejects.toThrow(InvalidRefreshTokenException);
  });

  /**
   * A token presented twice is the tell-tale of a theft: the legitimate client
   * would already have moved to the replacement. We cannot know which of the
   * two callers is the thief, so both lose every session.
   */
  it('revokes the whole family when a retired token comes back', async () => {
    const first = await signIn();
    await h.refresh.execute(new RefreshSessionCommand(first, null));

    await expect(h.refresh.execute(new RefreshSessionCommand(first, null))).rejects.toThrow(
      InvalidRefreshTokenException,
    );

    expect(h.refreshTokens.live('user-1')).toHaveLength(0);
  });

  it('locks out the thief and the victim alike', async () => {
    const first = await signIn();
    const honest = await h.refresh.execute(new RefreshSessionCommand(first, null));

    await expect(h.refresh.execute(new RefreshSessionCommand(first, null))).rejects.toThrow();

    // The token the honest client is holding died with the rest of the family.
    await expect(
      h.refresh.execute(new RefreshSessionCommand(honest.refreshToken, null)),
    ).rejects.toThrow(InvalidRefreshTokenException);
  });

  /**
   * An expired token is an ordinary end of session, not evidence of anything.
   * Revoking the family here would log people out for going on holiday.
   */
  it('does not treat mere expiry as a theft', async () => {
    anAccount(h);
    const live = await h.login.execute(
      new LoginCommand({ email: 'chef@chantier.fr', password: PASSWORD }, null),
    );
    await h.refreshTokens.save(
      RefreshToken.issue({
        id: 'stale',
        userId: 'user-1',
        tokenHash: h.tokenIssuer.hashToken('yesterday'),
        expiresAt: new Date(Date.now() - 1),
      }),
    );

    await expect(
      h.refresh.execute(new RefreshSessionCommand('yesterday', null)),
    ).rejects.toThrow(InvalidRefreshTokenException);

    // The session opened in another tab is untouched.
    await expect(
      h.refresh.execute(new RefreshSessionCommand(live.refreshToken, null)),
    ).resolves.toBeTruthy();
  });

  /**
   * The access guard is stateless, so a deactivated account keeps its rights
   * until its 5-minute token expires. Refresh is where that window closes —
   * and it must close for every device at once, not just the one asking.
   */
  it('closes every session when the account was deactivated mid-flight', async () => {
    const first = await signIn();
    const other = await h.login.execute(
      new LoginCommand({ email: 'chef@chantier.fr', password: PASSWORD }, 'phone'),
    );
    h.users.rows.set('user-1', anAccount(h, { active: false }));

    await expect(h.refresh.execute(new RefreshSessionCommand(first, null))).rejects.toThrow(
      InvalidRefreshTokenException,
    );

    expect(h.refreshTokens.live('user-1')).toHaveLength(0);
    await expect(
      h.refresh.execute(new RefreshSessionCommand(other.refreshToken, null)),
    ).rejects.toThrow(InvalidRefreshTokenException);
  });
});

describe('accepting an invitation', () => {
  let h: Harness;
  beforeEach(() => {
    h = setup();
  });

  function anInvitation(overrides: Partial<{ expiresAt: Date; acceptedAt: Date | null }> = {}) {
    anAccount(h, { passwordHash: null });
    const invitation = Invitation.issue({
      id: 'inv-1',
      userId: 'user-1',
      tokenHash: h.tokenIssuer.hashToken('welcome'),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 600_000),
      acceptedAt: overrides.acceptedAt ?? null,
      invitedById: 'admin-1',
    });
    h.invitations.rows.set(invitation.id, invitation);
    return invitation;
  }

  it('sets the password, burns the link and signs the person straight in', async () => {
    anInvitation();

    const session = await h.accept.execute(
      new AcceptInvitationCommand('welcome', PASSWORD, 'Chrome'),
    );

    expect(session.accessToken).toBeTruthy();
    expect(h.users.rows.get('user-1')?.canAuthenticate()).toBe(true);
    expect(h.invitations.rows.get('inv-1')?.isUsable()).toBe(false);
    expect(h.refreshTokens.live('user-1')).toHaveLength(1);
  });

  it('lets the new account sign in normally afterwards', async () => {
    anInvitation();
    await h.accept.execute(new AcceptInvitationCommand('welcome', PASSWORD, null));

    await expect(
      h.login.execute(new LoginCommand({ email: 'chef@chantier.fr', password: PASSWORD }, null)),
    ).resolves.toBeTruthy();
  });

  /**
   * Unknown, already used and expired all answer the same thing. Telling them
   * apart would turn the endpoint into an oracle for guessing tokens.
   */
  it.each([
    ['unknown', () => undefined],
    ['already used', () => anInvitation({ acceptedAt: new Date() })],
    ['expired', () => anInvitation({ expiresAt: new Date(Date.now() - 1) })],
  ])('gives the same answer for an %s link', async (_label, arrange) => {
    arrange();

    await expect(
      h.accept.execute(new AcceptInvitationCommand('welcome', PASSWORD, null)),
    ).rejects.toThrow(InvalidInvitationException);
  });

  it('refuses a link whose account was disabled before it was used', async () => {
    anInvitation();
    h.users.rows.set('user-1', anAccount(h, { passwordHash: null, active: false }));

    await expect(
      h.accept.execute(new AcceptInvitationCommand('welcome', PASSWORD, null)),
    ).rejects.toThrow(AccountDisabledException);
  });

  it('applies the password policy, listing every unmet rule at once', async () => {
    anInvitation();

    const error = await h.accept
      .execute(new AcceptInvitationCommand('welcome', 'short', null))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(WeakPasswordException);
    expect((error as WeakPasswordException).fieldErrors?.length).toBeGreaterThan(1);
  });

  /**
   * The link is burned only once the password is in. Were it consumed first, an
   * invitee who mistypes their password would be locked out of an account they
   * never got to open — and the only way back would be an admin re-inviting.
   */
  it('leaves the link usable when the chosen password is rejected', async () => {
    anInvitation();

    await expect(
      h.accept.execute(new AcceptInvitationCommand('welcome', 'short', null)),
    ).rejects.toThrow(WeakPasswordException);

    expect(h.invitations.rows.get('inv-1')?.isUsable()).toBe(true);
    await expect(
      h.accept.execute(new AcceptInvitationCommand('welcome', PASSWORD, null)),
    ).resolves.toBeTruthy();
  });

  it('refuses a password built from the invitee own identity', async () => {
    anInvitation();

    await expect(
      h.accept.execute(new AcceptInvitationCommand('welcome', 'chef@chantier.fr1A!', null)),
    ).rejects.toThrow(WeakPasswordException);
  });

  it('cannot be replayed once it has worked', async () => {
    anInvitation();
    await h.accept.execute(new AcceptInvitationCommand('welcome', PASSWORD, null));

    await expect(
      h.accept.execute(new AcceptInvitationCommand('welcome', 'Another-Pass-99!', null)),
    ).rejects.toThrow(InvalidInvitationException);
  });
});
