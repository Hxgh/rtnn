import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token to rotate session',
    minLength: 20,
    example: 'rt_eyJhbGciOi...',
  })
  @IsString()
  @MinLength(20)
  refreshToken: string;
}
