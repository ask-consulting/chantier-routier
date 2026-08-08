import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { IUpdatePreferences, Locale } from '@chantia/shared';

export class UpdatePreferencesDto implements IUpdatePreferences {
  @ApiProperty({ enum: Locale, description: 'Interface language, stored on the account' })
  @IsEnum(Locale)
  locale: Locale;
}
