import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { WorkerDeletedEvent } from '@shared/domain/events/worker-deleted.event';
import {
  WORKER_REPOSITORY_PORT,
  WorkerRepositoryPort,
} from '../../domain/ports/worker-repository.port';
import { WorkerHasHistoryException } from '../../domain/exceptions/worker.exceptions';
import { DeleteWorkerCommand } from './delete-worker.command';

/**
 * Removes a worker who never worked — and refuses everybody else.
 *
 * **Deleting is the exception, deactivating is the rule.** `timesheets.worker_id`
 * cascades, so a deletion erases the hours too, and with them the labour cost of
 * every worksite this person appeared on. A month closed in March would change
 * value in September with nothing to explain it. The only case where deletion is
 * harmless is the one it is kept for: a row created by mistake, before anybody
 * pointed to it.
 *
 * The event that follows is not decoration either: `app_users.worker_id` is a
 * soft reference — no foreign key crosses the schema boundary — so nothing in
 * the database clears it. Identity listens and does.
 */
@CommandHandler(DeleteWorkerCommand)
export class DeleteWorkerHandler implements ICommandHandler<DeleteWorkerCommand> {
  constructor(
    @Inject(WORKER_REPOSITORY_PORT)
    private readonly repository: WorkerRepositoryPort,
    private readonly events: EventBus,
  ) {}

  async execute(command: DeleteWorkerCommand): Promise<void> {
    const { workerId } = command;

    const worker = await this.repository.findById(workerId);
    if (!worker) {
      throw new ResourceNotFoundException('Worker', workerId);
    }

    const timesheets = await this.repository.countTimesheets(workerId);
    if (timesheets > 0) {
      throw new WorkerHasHistoryException(timesheets);
    }

    await this.repository.delete(workerId);

    // After the delete, never before: an account must not lose its link to a
    // worker that is still there because the deletion failed.
    this.events.publish(new WorkerDeletedEvent(workerId, worker.organizationId));
  }
}
