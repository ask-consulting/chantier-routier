import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class LogoutDto {
  @ApiPropertyOptional({
    description:
      'Session to end. Omit to log out of every device — the right call when a phone is lost.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  @IsOptional()
  refreshToken?: string;
}
