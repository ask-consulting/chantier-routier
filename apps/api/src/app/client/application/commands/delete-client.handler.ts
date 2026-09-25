import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Client } from '../../domain/entities/client.entity';
import { ClientInUseException } from '../../domain/exceptions/client.exceptions';
import {
  CLIENT_REPOSITORY_PORT,
  ClientRepositoryPort,
} from '../../domain/ports/client-repository.port';
import { DeleteClientCommand } from './delete-client.command';

/**
 * Removes a client from every list and lookup, without a `DELETE`.
 *
 * Refused while a current worksite still points at it: the worksite would go
 * on naming a client nobody can open or pick again. Reassigning the worksite
 * (or deleting it) comes first. Soft-deleted worksites do not count — they
 * are already out of sight.
 */
@CommandHandler(DeleteClientCommand)
export class DeleteClientHandler implements ICommandHandler<DeleteClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY_PORT)
    private readonly repository: ClientRepositoryPort,
  ) {}

  async execute(command: DeleteClientCommand): Promise<Client> {
    const { clientId } = command;

    const client = await this.repository.findById(clientId);
    if (!client) {
      throw new ResourceNotFoundException('Client', clientId);
    }

    const worksites = await this.repository.countActiveWorksites(clientId);
    if (worksites > 0) {
      throw new ClientInUseException(worksites);
    }

    return this.repository.save(client.deleted());
  }
}
