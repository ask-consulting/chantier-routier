import { ApiProperty } from '@nestjs/swagger';
import { WorkerResponseDto } from './worker-response.dto';

export class PaginatedWorkerResponseDto {
  @ApiProperty({ type: [WorkerResponseDto] })
  items: WorkerResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
