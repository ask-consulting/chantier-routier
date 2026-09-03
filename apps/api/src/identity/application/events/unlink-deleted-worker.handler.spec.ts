import { describe, expect, it, vi } from 'vitest';
import { WorkerDeletedEvent } from '@shared/domain/events/worker-deleted.event';
import { User } from '../../domain/entities/user.entity';
import { UserRepositoryPort } from '../../domain/ports/user-repository.port';
import { UnlinkDeletedWorkerHandler } from './unlink-deleted-worker.handler';

/**
 * The one place where a promise made in `schema.prisma` is actually kept.
 *
 * `app_users.worker_id` is a soft reference — no foreign key crosses the schema
 * boundary, because that is what keeps `identity` extractable. The comment there
 * says "nulled by the application when the worker is deleted"; this handler is
 * the application, and these tests are the only thing standing between that
 * sentence and a lie.
 */

function linkedUser(): User {
  return User.create({
    id: 'user-1',
    organizationId: 'org-1',
    email: 'chef@exemple.fr',
    passwordHash: 'scrypt$…',
    firstName: 'Karim',
    lastName: 'Benali',
    workerId: 'worker-1',
  });
}

function setup(options: { user?: User | null; failsOn?: 'find' | 'save' } = {}) {
  const saved: User[] = [];
  const users = {
    findByWorkerId: vi.fn(async () => {
      if (options.failsOn === 'find') {
        throw new Error('base injoignable');
      }
      return options.user === undefined ? linkedUser() : options.user;
    }),
    save: vi.fn(async (user: User) => {
      if (options.failsOn === 'save') {
        throw new Error('écriture refusée');
      }
      saved.push(user);
      return user;
    }),
  } as unknown as UserRepositoryPort;

  return { users, saved, handler: new UnlinkDeletedWorkerHandler(users) };
}

/** `handle` is fire-and-forget; let its promise settle before asserting. */
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('UnlinkDeletedWorkerHandler', () => {
  it('clears the link on the account that pointed at the deleted worker', async () => {
    const { handler, saved } = setup();

    handler.handle(new WorkerDeletedEvent('worker-1', 'org-1'));
    await settle();

    expect(saved[0].workerId).toBeNull();
    // Nothing else moves: the person keeps their access, their role and their
    // name. They stopped being on the payroll, not in the company.
    expect(saved[0].email).toBe('chef@exemple.fr');
    expect(saved[0].active).toBe(true);
  });

  it('does nothing when no account was linked — the common case', async () => {
    const { handler, users } = setup({ user: null });

    handler.handle(new WorkerDeletedEvent('worker-1', 'org-1'));
    await settle();

    // Most workers on a site never had a login.
    expect(users.save).not.toHaveBeenCalled();
  });

  it('swallows a failure instead of breaking a deletion that already happened', async () => {
    const { handler } = setup({ failsOn: 'save' });

    // The worker row is gone by the time this runs. A wrong link is a
    // inconsistency to repair; turning it into a 500 would report a failure for
    // an operation that succeeded.
    expect(() => handler.handle(new WorkerDeletedEvent('worker-1', 'org-1'))).not.toThrow();
    await settle();
  });

  it('swallows a failed lookup too', async () => {
    const { handler, users } = setup({ failsOn: 'find' });

    expect(() => handler.handle(new WorkerDeletedEvent('worker-1', 'org-1'))).not.toThrow();
    await settle();
    expect(users.save).not.toHaveBeenCalled();
  });
});
