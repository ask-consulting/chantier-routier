import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '@shared/prisma/prisma.module';
import { CreateEquipmentHandler } from './application/commands/create-equipment.handler';
import { DeleteEquipmentHandler } from './application/commands/delete-equipment.handler';
import { UpdateEquipmentHandler } from './application/commands/update-equipment.handler';
import { GetEquipmentByIdHandler } from './application/queries/get-equipment-by-id.handler';
import { GetEquipmentListHandler } from './application/queries/get-equipment-list.handler';
import { EQUIPMENT_REPOSITORY_PORT } from './domain/ports/equipment-repository.port';
import { EquipmentRepository } from './infrastructure/repositories/equipment.repository';
import { EquipmentController } from './presentation/controllers/equipment.controller';

const Handlers = [
  CreateEquipmentHandler,
  UpdateEquipmentHandler,
  DeleteEquipmentHandler,
  GetEquipmentListHandler,
  GetEquipmentByIdHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [EquipmentController],
  providers: [
    ...Handlers,
    {
      provide: EQUIPMENT_REPOSITORY_PORT,
      useClass: EquipmentRepository,
    },
  ],
})
export class EquipmentModule {}
