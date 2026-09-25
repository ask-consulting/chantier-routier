import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IBillingAddressInput, IClientContactInput } from '@chantia/shared';

/**
 * Digits, spaces, `+ ( ) . -` — the way people actually type a number
 * (`+216 71 123 456`, `98.123.456`). Loose on purpose: the format is for a
 * human to dial, not for a machine to parse.
 */
const PHONE = /^[0-9+().\s-]{6,30}$/;

export class BillingAddressDto implements IBillingAddressInput {
  @ApiPropertyOptional({ nullable: true, example: '12 avenue Habib Bourguiba' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  line1?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  line2?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '4000' })
  @IsString()
  @MaxLength(20)
  @IsOptional()
  postalCode?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Sousse' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  city?: string | null;

  @ApiPropertyOptional({ example: 'TN', description: 'ISO 3166-1 alpha-2. Defaults to TN.' })
  @IsISO31661Alpha2()
  @IsOptional()
  country?: string;
}

export class ClientContactDto implements IClientContactInput {
  @ApiPropertyOptional({ description: 'Absent for a new contact; an existing one’s id to keep it.' })
  @IsUUID()
  @IsOptional()
  id?: string;

  @ApiPropertyOptional({ nullable: true, example: 'Sami' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  firstName?: string | null;

  @ApiProperty({ example: 'Trabelsi' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ nullable: true, example: 'Directeur technique' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  position?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '+216 98 123 456' })
  @Matches(PHONE, { message: 'mobilePhone must be a phone number' })
  @IsOptional()
  mobilePhone?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '+216 73 123 456' })
  @Matches(PHONE, { message: 'landlinePhone must be a phone number' })
  @IsOptional()
  landlinePhone?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'sami.trabelsi@commune-sousse.tn' })
  @IsEmail()
  @MaxLength(200)
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({
    description: 'One per client. None flagged: the first becomes primary.',
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
