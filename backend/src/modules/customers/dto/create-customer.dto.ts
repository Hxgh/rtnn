import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { TEMPLATE_DEFAULTS } from '@rtnn/config';

export class CreateCustomerDto {
  @ApiProperty({ example: TEMPLATE_DEFAULTS.customer.email })
  @IsEmail()
  email: string;

  @ApiProperty({ example: TEMPLATE_DEFAULTS.customer.displayName })
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
