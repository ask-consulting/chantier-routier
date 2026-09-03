import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { Worker } from '../../domain/entities/worker.entity';
import {
  WORKER_REPOSITORY_PORT,
  WorkerRepositoryPort,
} from '../../domain/ports/worker-repository.port';
import { CreateWorkerCommand } from './create-worker.command';

/**
 * Adds somebody to the payroll — with no account, and no way to make one here.
 *
 * Giving them access is a separate act, on a separate screen: `POST /users`
 * with this worker's id. That order matters, because most people on a worksite
 * will never get past this step.
 */
@CommandHandler(CreateWorkerCommand)
export class CreateWorkerHandler implements ICommandHandler<CreateWorkerCommand> {
  constructor(
    @Inject(WORKER_REPOSITORY_PORT)
    private readonly repository: WorkerRepositoryPort,
  ) {}

  async execute(command: CreateWorkerCommand): Promise<Worker> {
    const { organizationId, data } = command;

    return this.repository.save(
      Worker.create({
        id: randomUUID(),
        organizationId,
        name: data.name,
        qualification: data.qualification,
        hourlyRate: data.hourlyRate,
        active: data.active,
      }),
    );
  }
}
