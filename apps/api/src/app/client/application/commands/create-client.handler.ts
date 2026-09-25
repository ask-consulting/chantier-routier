import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';
import { Client } from '../../domain/entities/client.entity';
import {
  CLIENT_REPOSITORY_PORT,
  ClientRepositoryPort,
} from '../../domain/ports/client-repository.port';
import { contactsFromInput } from '../contacts-from-input';
import { CreateClientCommand } from './create-client.command';

@CommandHandler(CreateClientCommand)
export class CreateClientHandler implements ICommandHandler<CreateClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY_PORT)
    private readonly repository: ClientRepositoryPort,
  ) {}

  async execute(command: CreateClientCommand): Promise<Client> {
    const { organizationId, data } = command;

    const client = Client.create({
      id: randomUUID(),
      organizationId,
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      legalName: data.legalName,
      billingAddress: data.billingAddress,
      // A new client owns no contact yet, so any `id` sent is refused.
      contacts: contactsFromInput(data.contacts ?? []),
    });

    return this.repository.save(client);
  }
}
