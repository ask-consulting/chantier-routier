import { ApiProperty } from '@nestjs/swagger';
import { IWorker } from '@chantia/shared';
import { Worker } from '../../domain/entities/worker.entity';

/**
 * An HR record on the wire. No email, no role, nothing that could sign in —
 * a worker is not an account, and this DTO is where that stays true.
 */
export class WorkerResponseDto implements IWorker {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) qualification: string | null;
  @ApiProperty({ example: 18.5 }) hourlyRate: number;
  @ApiProperty() active: boolean;
  @ApiProperty({ required: false }) createdAt?: string;
  @ApiProperty({ required: false }) updatedAt?: string;

  static fromDomain(worker: Worker): WorkerResponseDto {
    const dto = new WorkerResponseDto();
    dto.id = worker.id;
    dto.organizationId = worker.organizationId;
    dto.name = worker.name;
    dto.qualification = worker.qualification;
    dto.hourlyRate = worker.hourlyRate;
    dto.active = worker.active;
    dto.createdAt = worker.createdAt?.toISOString();
    dto.updatedAt = worker.updatedAt?.toISOString();
    return dto;
  }
}
