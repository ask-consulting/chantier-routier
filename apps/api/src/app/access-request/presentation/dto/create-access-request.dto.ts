import { AccessRequestKind, AccessRequestLocale, ICreateAccessRequest } from '@chantia/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** At least one visible character, and no control character such as a line break. */
const SINGLE_LINE = /^[^\p{Cc}]*[^\p{Cc}\s][^\p{Cc}]*$/u;
const PHONE = /^\+?[0-9][0-9 .()-]{5,28}$/;

export class CreateAccessRequestDto implements ICreateAccessRequest {
  @ApiProperty({ example: 'Société Exemple' })
  @IsString()
  @MaxLength(150)
  @Matches(SINGLE_LINE)
  company: string;

  @ApiProperty({ example: '+216 71 000 000' })
  @IsString()
  @Matches(PHONE)
  phone: string;

  @ApiProperty({ enum: AccessRequestKind })
  @IsEnum(AccessRequestKind)
  kind: AccessRequestKind;

  @ApiProperty({ enum: AccessRequestLocale })
  @IsEnum(AccessRequestLocale)
  locale: AccessRequestLocale;

  @ApiPropertyOptional({ description: 'Leave empty. Only a bot fills this in.' })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  website?: string;
}
