import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, Min } from 'class-validator';
import { IAssignTaskWorker, ILinkTaskEquipment, PayMode } from '@chantia/shared';
import { IsMoney } from '@shared/validation/is-money.decorator';

export class AssignTaskWorkerDto implements IAssignTaskWorker {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  workerId: string;

  @ApiProperty({ enum: PayMode })
  @IsEnum(PayMode)
  payMode: PayMode;

  @ApiPropertyOptional({
    description:
      'In the currency’s smallest unit. Required by the task; by the hour or the day, ' +
      'the worker’s rate by default.',
  })
  @IsMoney()
  @Min(0)
  @IsOptional()
  rate?: number;
}

export class LinkTaskEquipmentDto implements ILinkTaskEquipment {
  @ApiProperty({ format: 'uuid', description: 'A booking of a machine on the worksite' })
  @IsUUID()
  equipmentAssignmentId: string;
}
