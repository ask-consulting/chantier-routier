import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ICreateOwnMaterial, IUpdateOwnMaterial, MaterialUnit } from '@chantia/shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateOwnMaterialDto implements ICreateOwnMaterial {
  @ApiProperty({ format: 'uuid', description: 'One of the catalog’s categories' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'Sable de oued', maxLength: 120 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit: MaterialUnit;
}

export class UpdateOwnMaterialDto
  extends PartialType(CreateOwnMaterialDto)
  implements IUpdateOwnMaterial {}
