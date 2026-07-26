import { ApiProperty } from '@nestjs/swagger';
import { WorksiteResponseDto } from './worksite-response.dto';

export class PaginatedWorksiteResponseDto {
  @ApiProperty({ type: [WorksiteResponseDto] })
  items: WorksiteResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
