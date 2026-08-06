import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IRefreshRequest } from '@chantia/shared';

export class RefreshSessionDto implements IRefreshRequest {
  @ApiProperty({ description: 'The opaque refresh token handed out with the session' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}
