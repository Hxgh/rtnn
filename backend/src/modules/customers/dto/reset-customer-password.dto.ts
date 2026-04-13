import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetCustomerPasswordDto {
  @ApiProperty({ minLength: 8, example: 'Customer123!@#' })
  @IsString()
  @MinLength(8)
  nextPassword: string;
}
