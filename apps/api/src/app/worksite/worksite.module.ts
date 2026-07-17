import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { CreateWorksiteHandler } from './application/commands/create-worksite.handler';
import { GetWorksiteByIdHandler } from './application/queries/get-worksite-by-id.handler';
import { GetWorksiteCostsHandler } from './application/queries/get-worksite-costs.handler';
import { GetWorksitesHandler } from './application/queries/get-worksites.handler';
import { WORKSITE_REPOSITORY_PORT } from './domain/ports/worksite-repository.port';
import { WorksiteRepository } from './infrastructure/repositories/worksite.repository';
import { WorksiteController } from './presentation/controllers/worksite.controller';

const Handlers = [
  CreateWorksiteHandler,
  GetWorksitesHandler,
  GetWorksiteByIdHandler,
  GetWorksiteCostsHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [WorksiteController],
  providers: [
    ...Handlers,
    {
      provide: WORKSITE_REPOSITORY_PORT,
      useClass: WorksiteRepository,
    },
  ],
})
export class WorksiteModule {}
