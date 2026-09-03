import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { WorkerDeletedEvent } from '@shared/domain/events/worker-deleted.event';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Worker } from '../../domain/entities/worker.entity';
import {
  WORKER_REPOSITORY_PORT,
  WorkerRepositoryPort,
} from '../../domain/ports/worker-repository.port';
import { DeleteWorkerCommand } from './delete-worker.command';

/**
 * "Delete" always succeeds — what it does depends on whether there is
 * anything to lose.
 *
 * **A worker with timesheets is deactivated, not deleted.**
 * `timesheets.worker_id` cascades, so an actual deletion would erase the hours
 * with it — and with them the labour cost of every worksite this person
 * appeared on. A month closed in March would change value in September, with
 * nothing to explain it. Setting `active: false` keeps every row exactly as
 * it was: the timesheets, the rate they were paid at the time, the person's
 * name. `active` is the same flag somebody leaving the company sets by hand;
 * a blocked delete simply flips it for them.
 *
 * **A worker with no history is actually removed**, row and all — there is
 * nothing behind it to protect. That is also the one case where the identity
 * side needs telling: a soft-deleted worker still exists, so an account
 * pointed at it (`app_users.worker_id`) still points at something real, and
 * must not be unlinked. Only a real deletion publishes `WorkerDeletedEvent`.
 */
@CommandHandler(DeleteWorkerCommand)
export class DeleteWorkerHandler implements ICommandHandler<DeleteWorkerCommand> {
  constructor(
    @Inject(WORKER_REPOSITORY_PORT)
    private readonly repository: WorkerRepositoryPort,
    private readonly events: EventBus,
  ) {}

  async execute(command: DeleteWorkerCommand): Promise<Worker> {
    const { workerId } = command;

    const worker = await this.repository.findById(workerId);
    if (!worker) {
      throw new ResourceNotFoundException('Worker', workerId);
    }

    const timesheets = await this.repository.countTimesheets(workerId);
    if (timesheets > 0) {
      return this.repository.save(worker.with({ active: false }));
    }

    await this.repository.delete(workerId);

    // Only reached when the worker is truly gone: an account must not lose
    // its link to a worker that a soft delete left standing.
    this.events.publish(new WorkerDeletedEvent(workerId, worker.organizationId));

    return worker;
  }
}
