import { Transform, type TransformFnParams } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trim = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class ClientDownloadQueryDto {
  @ApiProperty({ example: 'appMobile' })
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  client: string;

  @ApiProperty({ example: 'android' })
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  target: string;

  @ApiPropertyOptional({ example: 'production' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  channel?: string;

  @ApiPropertyOptional({ example: '1.2.0' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  currentVersion?: string;
}
