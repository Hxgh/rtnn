import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const trim = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ClientReleaseListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'production' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ example: 'appMobile' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  client?: string;

  @ApiPropertyOptional({ example: 'android' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  target?: string;

  @ApiPropertyOptional({ example: 'synced' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  distributionStatus?: string;
}
