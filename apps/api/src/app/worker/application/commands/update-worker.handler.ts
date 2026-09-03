import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Worker } from '../../domain/entities/worker.entity';
import {
  WORKER_REPOSITORY_PORT,
  WorkerRepositoryPort,
} from '../../domain/ports/worker-repository.port';
import { UpdateWorkerCommand } from './update-worker.command';

/**
 * Renames, re-rates, or deactivates — one command, because they are one act
 * from the caller's side and they all end in the same row.
 *
 * **Changing an hourly rate does not rewrite history.** Past cost is computed
 * from the timesheets already recorded, which carry their own hours; only future
 * ones are valued at the new rate. That is the behaviour anybody expects from a
 * raise, and it comes for free here because the rate is read at computation
 * time — worth writing down before somebody "fixes" it into a snapshot.
 */
@CommandHandler(UpdateWorkerCommand)
export class UpdateWorkerHandler implements ICommandHandler<UpdateWorkerCommand> {
  constructor(
    @Inject(WORKER_REPOSITORY_PORT)
    private readonly repository: WorkerRepositoryPort,
  ) {}

  async execute(command: UpdateWorkerCommand): Promise<Worker> {
    const { workerId, data } = command;

    const worker = await this.repository.findById(workerId);
    if (!worker) {
      // Another tenant's row is not found either — the filter saw to that.
      throw new ResourceNotFoundException('Worker', workerId);
    }

    return this.repository.save(worker.with(data));
  }
}
