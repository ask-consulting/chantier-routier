import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { CreateEquipmentAssignmentHandler } from './application/commands/create-equipment-assignment.handler';
import { CreateEquipmentHandler } from './application/commands/create-equipment.handler';
import { DeleteEquipmentAssignmentHandler } from './application/commands/delete-equipment-assignment.handler';
import { UpdateEquipmentAssignmentHandler } from './application/commands/update-equipment-assignment.handler';
import { GetEquipmentAssignmentsHandler } from './application/queries/get-equipment-assignments.handler';
import { DeleteEquipmentHandler } from './application/commands/delete-equipment.handler';
import { UpdateEquipmentHandler } from './application/commands/update-equipment.handler';
import { GetEquipmentByIdHandler } from './application/queries/get-equipment-by-id.handler';
import { GetEquipmentCatalogHandler } from './application/queries/get-equipment-catalog.handler';
import { GetEquipmentListHandler } from './application/queries/get-equipment-list.handler';
import { EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT } from './domain/ports/equipment-assignment-repository.port';
import { EQUIPMENT_CATALOG_PORT } from './domain/ports/equipment-catalog.port';
import { EQUIPMENT_REPOSITORY_PORT } from './domain/ports/equipment-repository.port';
import { EquipmentAssignmentRepository } from './infrastructure/repositories/equipment-assignment.repository';
import { EquipmentCatalogRepository } from './infrastructure/repositories/equipment-catalog.repository';
import { EquipmentRepository } from './infrastructure/repositories/equipment.repository';
import { EquipmentAssignmentController } from './presentation/controllers/equipment-assignment.controller';
import { EquipmentCatalogController } from './presentation/controllers/equipment-catalog.controller';
import { EquipmentController } from './presentation/controllers/equipment.controller';

const Handlers = [
  CreateEquipmentHandler,
  UpdateEquipmentHandler,
  DeleteEquipmentHandler,
  GetEquipmentListHandler,
  GetEquipmentByIdHandler,
  GetEquipmentCatalogHandler,
  CreateEquipmentAssignmentHandler,
  UpdateEquipmentAssignmentHandler,
  DeleteEquipmentAssignmentHandler,
  GetEquipmentAssignmentsHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [EquipmentController, EquipmentCatalogController, EquipmentAssignmentController],
  providers: [
    ...Handlers,
    {
      provide: EQUIPMENT_REPOSITORY_PORT,
      useClass: EquipmentRepository,
    },
    {
      provide: EQUIPMENT_CATALOG_PORT,
      useClass: EquipmentCatalogRepository,
    },
    {
      provide: EQUIPMENT_ASSIGNMENT_REPOSITORY_PORT,
      useClass: EquipmentAssignmentRepository,
    },
  ],
})
export class EquipmentModule {}
