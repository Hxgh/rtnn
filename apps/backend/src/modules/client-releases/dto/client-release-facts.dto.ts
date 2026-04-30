import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class ClientReleaseFactsDto {
  @ApiProperty({ example: 'rtnn.deploy.client-release-facts.v1' })
  @IsString()
  schemaVersion: string;

  @ApiProperty({ example: 'production' })
  @IsString()
  environment: string;

  @ApiPropertyOptional({ example: '2026-04-30T06:24:12.000Z' })
  @IsOptional()
  @IsString()
  generatedAt?: string;

  @ApiPropertyOptional({ example: 'write' })
  @IsOptional()
  @IsString()
  mode?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  project?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  binding?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  source?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  release?: Record<string, unknown>;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  artifacts?: Record<string, unknown>;

  @ApiProperty({ type: Object })
  @IsObject()
  clients: Record<string, unknown>;
}
