import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trim = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ClientDownloadListQueryDto {
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
}
