import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'customer@rtnn.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Template Customer' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ minLength: 8, example: 'Customer123!@#' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'default' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
