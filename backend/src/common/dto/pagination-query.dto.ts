import { Transform, Type, type TransformFnParams } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trimStringValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Current page number, starts from 1',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size, max 100',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Fuzzy search keyword',
    example: 'demo',
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trimStringValue(value))
  @IsString()
  search?: string;
}
