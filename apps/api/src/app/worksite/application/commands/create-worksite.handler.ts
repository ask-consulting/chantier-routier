import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { Worksite } from '../../domain/entities/worksite.entity';
import {
  InvalidWorksiteScheduleException,
  UnknownWorksiteClientException,
} from '../../domain/exceptions/worksite.exceptions';
import {
  WORKSITE_REPOSITORY_PORT,
  WorksiteRepositoryPort,
} from '../../domain/ports/worksite-repository.port';
import { CreateWorksiteCommand } from './create-worksite.command';

@CommandHandler(CreateWorksiteCommand)
export class CreateWorksiteHandler implements ICommandHandler<CreateWorksiteCommand> {
  constructor(
    @Inject(WORKSITE_REPOSITORY_PORT)
    private readonly repository: WorksiteRepositoryPort,
  ) {}

  async execute(command: CreateWorksiteCommand): Promise<Worksite> {
    const { organizationId, data } = command;

    const worksite = Worksite.create({
      id: randomUUID(),
      organizationId,
      code: data.code,
      name: data.name,
      clientId: data.clientId,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
      plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
      status: data.status,
      totalBudget: data.totalBudget,
    });

    if (!worksite.hasConsistentSchedule()) {
      throw new InvalidWorksiteScheduleException();
    }
    if (worksite.clientId && !(await this.repository.isAssignableClient(worksite.clientId))) {
      throw new UnknownWorksiteClientException(worksite.clientId);
    }

    return this.repository.save(worksite);
  }
}
