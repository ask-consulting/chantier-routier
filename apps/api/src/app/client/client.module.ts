import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { CreateClientHandler } from './application/commands/create-client.handler';
import { DeleteClientHandler } from './application/commands/delete-client.handler';
import { UpdateClientHandler } from './application/commands/update-client.handler';
import { GetClientByIdHandler } from './application/queries/get-client-by-id.handler';
import { GetClientsHandler } from './application/queries/get-clients.handler';
import { CLIENT_REPOSITORY_PORT } from './domain/ports/client-repository.port';
import { ClientRepository } from './infrastructure/repositories/client.repository';
import { ClientController } from './presentation/controllers/client.controller';

const Handlers = [
  CreateClientHandler,
  UpdateClientHandler,
  DeleteClientHandler,
  GetClientsHandler,
  GetClientByIdHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ClientController],
  providers: [
    ...Handlers,
    {
      provide: CLIENT_REPOSITORY_PORT,
      useClass: ClientRepository,
    },
  ],
})
export class ClientModule {}
