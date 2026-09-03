import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { WorkerDeletedEvent } from '@shared/domain/events/worker-deleted.event';
import {
  USER_REPOSITORY_PORT,
  UserRepositoryPort,
} from '../../domain/ports/user-repository.port';

/**
 * Clears `app_users.worker_id` when the HR record it points at is deleted.
 *
 * **Why this is not a foreign key.** `invitations` and `app_users` live in
 * `identity`; `workers` lives in `public`. No foreign key crosses that boundary,
 * by design — it is what keeps the identity context extractable as its own
 * service (`pg_dump -n identity`). The price of that decision is exactly this
 * handler: referential integrity across contexts is the application's job, and
 * `schema.prisma` has promised since August that the application does it.
 *
 * **Why an event and not a call.** The business side may not import `identity/`
 * and `identity/` may not import the business side — `eslint.config.mjs` refuses
 * both. They meet on an event class in `shared/`, which is also the shape this
 * takes the day identity moves out: a message rather than a method.
 *
 * It cannot fail the deletion it reacts to. The worker is already gone by the
 * time this runs; an account left pointing at nothing is a wrong link, not a
 * lost row, and it must not turn a successful delete into a 500.
 */
@EventsHandler(WorkerDeletedEvent)
export class UnlinkDeletedWorkerHandler implements IEventHandler<WorkerDeletedEvent> {
  private readonly logger = new Logger(UnlinkDeletedWorkerHandler.name);

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly users: UserRepositoryPort,
  ) {}

  handle(event: WorkerDeletedEvent): void {
    void this.unlink(event.workerId);
  }

  private async unlink(workerId: string): Promise<void> {
    try {
      const user = await this.users.findByWorkerId(workerId);
      if (!user) {
        // The common case: most workers never had an account.
        return;
      }

      await this.users.save(user.withProfile({ workerId: null }));
      this.logger.log(`Unlinked ${user.email} from deleted worker ${workerId}`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to unlink the account of deleted worker ${workerId}: ` +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }
}
