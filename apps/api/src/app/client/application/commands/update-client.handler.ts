import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResourceNotFoundException } from '@shared/domain/exceptions/not-found.exception';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY_PORT,
  ClientRepositoryPort,
} from '../../domain/ports/client-repository.port';
import { contactsFromInput } from '../contacts-from-input';
import { UpdateClientCommand } from './update-client.command';

/**
 * Changes a client — names, type, address, contacts — as one write.
 *
 * Contacts are sent whole: the list in the payload *is* the new list. Simpler
 * for a form that edits them together, and it leaves no half-applied state
 * between a "remove contact" and an "add contact" request.
 */
@CommandHandler(UpdateClientCommand)
export class UpdateClientHandler implements ICommandHandler<UpdateClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY_PORT)
    private readonly repository: ClientRepositoryPort,
  ) {}

  async execute(command: UpdateClientCommand): Promise<Client> {
    const { clientId, data } = command;

    const client = await this.repository.findById(clientId);
    if (!client) {
      // Another tenant's row is not found either — the filter saw to that.
      throw new ResourceNotFoundException('Client', clientId);
    }

    const ownIds = new Set(client.contacts.map((contact) => contact.id));

    return this.repository.save(
      client.with({
        type: data.type,
        firstName: data.firstName,
        lastName: data.lastName,
        legalName: data.legalName,
        billingAddress: data.billingAddress,
        contacts: data.contacts === undefined ? undefined : contactsFromInput(data.contacts, ownIds),
      }),
    );
  }
}
