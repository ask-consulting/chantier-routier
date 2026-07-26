import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { Worksite } from '../../domain/entities/worksite.entity';
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
      client: data.client,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      plannedStartDate: data.plannedStartDate ? new Date(data.plannedStartDate) : null,
      plannedEndDate: data.plannedEndDate ? new Date(data.plannedEndDate) : null,
      status: data.status,
      totalBudget: data.totalBudget,
    });

    return this.repository.save(worksite);
  }
}
