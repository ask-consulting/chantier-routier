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
 * Removes a worker — from every list, from every lookup — without ever
 * issuing a `DELETE` against the row.
 *
 * `timesheets.worker_id` cascades, so an actual deletion would erase the
 * hours with it, and with them the labour cost of every worksite this person
 * appeared on: a month closed in March would change value in September, with
 * nothing to explain it. `worker.deleted()` sets `deletedAt` instead — the
 * row, the timesheets, the rate they were paid at the time all survive
 * untouched; `WorkerRepositoryPort.findById` and `.search` are what make sure
 * nobody sees the row again through the ordinary API.
 *
 * The account is still unlinked. From the product's point of view the worker
 * is gone — no list, no lookup, no way back through this API — so
 * `app_users.worker_id` must stop pointing at them exactly as it would after
 * a real delete. Only the *row* survives; the relationship does not.
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

    const deleted = await this.repository.save(worker.deleted());

    this.events.publish(new WorkerDeletedEvent(workerId, worker.organizationId));

    return deleted;
  }
}
