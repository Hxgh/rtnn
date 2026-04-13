import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerTagDto {
  @ApiProperty({ example: 'Potential' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'potential' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  slug?: string;

  @ApiPropertyOptional({ example: '#60a5fa' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'Potential customer segment' })
  @IsOptional()
  @IsString()
  description?: string;
}
