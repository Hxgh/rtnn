import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Refresh token to revoke',
    minLength: 20,
    example: 'rt_eyJhbGciOi...',
  })
  @IsOptional()
  @IsString()
  @MinLength(20)
  refreshToken?: string;
}
