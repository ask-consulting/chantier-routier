import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ICreateWorker } from '@chantia/shared';

export class CreateWorkerDto implements ICreateWorker {
  @ApiProperty({ example: 'Karim Benali' })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ example: 'Maçon', nullable: true })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  qualification?: string | null;

  @ApiProperty({
    example: 18.5,
    description: 'Cost of one hour, in the organization’s currency. Feeds every labour cost.',
  })
  // Positive rather than merely a number: a rate of zero silently makes somebody
  // free, which is never true and would pass unnoticed in a cost report.
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  hourlyRate: number;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
