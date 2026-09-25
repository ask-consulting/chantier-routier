import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ClientType, ICreateClient } from '@chantia/shared';
import { BillingAddressDto, ClientContactDto } from './client-input.dto';

/**
 * Which names are required depends on `type` — an individual needs a first
 * and a last name, a legal entity a legal name. That rule is the aggregate's
 * (`Client.create`), not this class's: it must also hold for a PATCH that
 * changes only the type, which a DTO cannot see the stored names of.
 */
export class CreateClientDto implements ICreateClient {
  @ApiProperty({ enum: ClientType })
  @IsEnum(ClientType)
  type: ClientType;

  @ApiPropertyOptional({ nullable: true, description: 'Individuals only.' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  firstName?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'Individuals only.' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  lastName?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Legal entities only — the raison sociale.',
    example: 'Municipalité de Sousse',
  })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  legalName?: string | null;

  @ApiPropertyOptional({ type: BillingAddressDto })
  @ValidateNested()
  @Type(() => BillingAddressDto)
  @IsOptional()
  billingAddress?: BillingAddressDto;

  @ApiPropertyOptional({ type: [ClientContactDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ClientContactDto)
  @IsOptional()
  contacts?: ClientContactDto[];
}
