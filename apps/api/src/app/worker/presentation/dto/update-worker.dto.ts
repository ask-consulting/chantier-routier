import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { IUpdateWorker } from '@chantia/shared';

/**
 * Every field optional — the same payload renames, re-rates and deactivates.
 *
 * `active: false` is the normal way somebody leaves the company: it keeps their
 * timesheets, and therefore keeps the cost of every worksite they worked on
 * true. Deleting is for a row created by mistake, and the API refuses it as soon
 * as a single timesheet points at the person.
 */
export class UpdateWorkerDto implements IUpdateWorker {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(150)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  qualification?: string | null;

  @ApiPropertyOptional({
    description: 'Applies to hours recorded from now on; past timesheets keep their own value.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'False when they leave. Keeps the history.' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
