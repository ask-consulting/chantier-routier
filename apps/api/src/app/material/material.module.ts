import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import {
  CreateOwnMaterialHandler,
  GetMaterialCatalogHandler,
  GetOwnMaterialsHandler,
  RemoveOwnMaterialHandler,
  UpdateOwnMaterialHandler,
} from './application/material.handlers';
import { MATERIAL_PORT } from './domain/ports/material.port';
import { MaterialRepository } from './infrastructure/repositories/material.repository';
import { MaterialController } from './presentation/controllers/material.controller';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [MaterialController],
  providers: [
    GetMaterialCatalogHandler,
    GetOwnMaterialsHandler,
    CreateOwnMaterialHandler,
    UpdateOwnMaterialHandler,
    RemoveOwnMaterialHandler,
    { provide: MATERIAL_PORT, useClass: MaterialRepository },
  ],
})
export class MaterialModule {}
