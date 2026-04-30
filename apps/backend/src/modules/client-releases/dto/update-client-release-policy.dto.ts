import { Transform, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trim = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

const toOptionalBoolean = (value: unknown): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return value;
};

export class UpdateClientReleasePolicyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    toOptionalBoolean(value),
  )
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  recommendedReleaseId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: '1.2.0' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  minimumSupportedVersion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    toOptionalBoolean(value),
  )
  @IsBoolean()
  forceUpdate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown =>
    toOptionalBoolean(value),
  )
  @IsBoolean()
  allowGithubFallback?: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trim(value))
  @IsString()
  notes?: string | null;
}
