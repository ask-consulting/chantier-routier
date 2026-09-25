import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Worksite } from '../../domain/entities/worksite.entity';
import { InvalidWorksiteScheduleException } from '../../domain/exceptions/worksite.exceptions';
import {
  WORKSITE_REPOSITORY_PORT,
  WorksiteRepositoryPort,
} from '../../domain/ports/worksite-repository.port';
import { UpdateWorksiteCommand } from './update-worksite.command';

/**
 * Renames, reschedules, re-budgets or moves a worksite through its statuses —
 * one command, because they all end in the same row.
 *
 * The schedule is checked on the *merged* result, not on the payload: moving
 * only the end date before an unchanged start is exactly the mistake a partial
 * update makes easy.
 */
@CommandHandler(UpdateWorksiteCommand)
export class UpdateWorksiteHandler implements ICommandHandler<UpdateWorksiteCommand> {
  constructor(
    @Inject(WORKSITE_REPOSITORY_PORT)
    private readonly repository: WorksiteRepositoryPort,
  ) {}

  async execute(command: UpdateWorksiteCommand): Promise<Worksite> {
    const { worksiteId, data } = command;

    const worksite = await this.repository.findById(worksiteId);
    if (!worksite) {
      // Another tenant's row is not found either — the filter saw to that.
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }

    const changed = worksite.with({
      ...data,
      plannedStartDate: toDate(data.plannedStartDate),
      plannedEndDate: toDate(data.plannedEndDate),
    });
    if (!changed.hasConsistentSchedule()) {
      throw new InvalidWorksiteScheduleException();
    }

    return this.repository.save(changed);
  }
}

/** Keeps the `undefined` / `null` distinction `Worksite.with` relies on. */
function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  return new Date(value);
}
