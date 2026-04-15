import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ minLength: 8, example: 'OldPass123!@#' })
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty({ minLength: 8, example: 'NewPass123!@#' })
  @IsString()
  @MinLength(8)
  nextPassword: string;
}
