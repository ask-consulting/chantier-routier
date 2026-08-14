import { ApiProperty } from '@nestjs/swagger';
import { IWorksite, WorksiteStatus } from '@chantia/shared';
import { Worksite } from '../../domain/entities/worksite.entity';

export class WorksiteResponseDto implements IWorksite {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) client: string | null;
  @ApiProperty({ nullable: true }) address: string | null;
  @ApiProperty({ nullable: true }) latitude: number | null;
  @ApiProperty({ nullable: true }) longitude: number | null;
  @ApiProperty({ nullable: true }) plannedStartDate: string | null;
  @ApiProperty({ nullable: true }) plannedEndDate: string | null;
  @ApiProperty({ enum: WorksiteStatus }) status: WorksiteStatus;
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Omitted entirely when the caller lacks budget:read.',
  })
  totalBudget?: number | null;
  @ApiProperty({ required: false }) createdAt?: string;
  @ApiProperty({ required: false }) updatedAt?: string;

  /**
   * @param options.includeBudget when false the budget is **left unset**, so
   *   `JSON.stringify` drops the key and the number never reaches the client.
   *   Sending `null` instead would have been a lie — indistinguishable from a
   *   worksite that genuinely has no budget — and sending it while hiding the
   *   column in the interface would have protected nothing at all: the value
   *   still sits in the network tab.
   */
  static fromDomain(
    worksite: Worksite,
    options: { includeBudget: boolean } = { includeBudget: true },
  ): WorksiteResponseDto {
    const dto = new WorksiteResponseDto();
    dto.id = worksite.id;
    dto.organizationId = worksite.organizationId;
    dto.code = worksite.code;
    dto.name = worksite.name;
    dto.client = worksite.client;
    dto.address = worksite.address;
    dto.latitude = worksite.latitude;
    dto.longitude = worksite.longitude;
    dto.plannedStartDate = worksite.plannedStartDate?.toISOString() ?? null;
    dto.plannedEndDate = worksite.plannedEndDate?.toISOString() ?? null;
    dto.status = worksite.status;
    if (options.includeBudget) {
      dto.totalBudget = worksite.totalBudget;
    }
    dto.createdAt = worksite.createdAt?.toISOString();
    dto.updatedAt = worksite.updatedAt?.toISOString();
    return dto;
  }
}
