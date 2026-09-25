import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Worksite } from '../../domain/entities/worksite.entity';
import {
  WORKSITE_REPOSITORY_PORT,
  WorksiteRepositoryPort,
} from '../../domain/ports/worksite-repository.port';
import { DeleteWorksiteCommand } from './delete-worksite.command';

/**
 * Removes a worksite — from every list, from every lookup — without ever
 * issuing a `DELETE` against the row.
 *
 * `timesheets.worksite_id` and `expenses.worksite_id` cascade, so an actual
 * deletion would erase the hours and receipts with it: hours somebody was paid
 * for, gone from every payroll total. `worksite.deleted()` sets `deletedAt`
 * instead; the repository's reads are what make the row disappear.
 *
 * Its code is freed at the same time — the unique index only covers current
 * worksites — so recreating `RN7-2026` after a mistake just works.
 */
@CommandHandler(DeleteWorksiteCommand)
export class DeleteWorksiteHandler implements ICommandHandler<DeleteWorksiteCommand> {
  constructor(
    @Inject(WORKSITE_REPOSITORY_PORT)
    private readonly repository: WorksiteRepositoryPort,
  ) {}

  async execute(command: DeleteWorksiteCommand): Promise<Worksite> {
    const { worksiteId } = command;

    const worksite = await this.repository.findById(worksiteId);
    if (!worksite) {
      throw new ResourceNotFoundException('Worksite', worksiteId);
    }

    return this.repository.save(worksite.deleted());
  }
}
