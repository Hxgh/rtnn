import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerGroupDto {
  @ApiProperty({ example: 'VIP Customers' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'vip-customers' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @ApiPropertyOptional({ example: 'High value customers' })
  @IsOptional()
  @IsString()
  description?: string;
}
