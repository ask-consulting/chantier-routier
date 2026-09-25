import { ApiProperty } from '@nestjs/swagger';
import { ClientResponseDto } from './client-response.dto';

export class PaginatedClientResponseDto {
  @ApiProperty({ type: [ClientResponseDto] })
  items: ClientResponseDto[];

  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
