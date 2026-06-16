import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AUDIT_CATEGORIES,
  AUDIT_OUTCOMES,
  AUDIT_RESOURCE_TYPES,
} from '@rtnn/shared-types';
import { Transform, type TransformFnParams } from 'class-transformer';
import { IsISO8601, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const actorTypes = ['admin', 'customer', 'system'] as const;
const trimStringValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: actorTypes, example: 'admin' })
  @IsOptional()
  @IsIn(actorTypes)
  actorType?: (typeof actorTypes)[number];

  @ApiPropertyOptional({ example: 'account.password.change' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ enum: AUDIT_CATEGORIES, example: 'iam' })
  @IsOptional()
  @IsIn(AUDIT_CATEGORIES)
  category?: (typeof AUDIT_CATEGORIES)[number];

  @ApiPropertyOptional({ enum: AUDIT_OUTCOMES, example: 'success' })
  @IsOptional()
  @IsIn(AUDIT_OUTCOMES)
  outcome?: (typeof AUDIT_OUTCOMES)[number];

  @ApiPropertyOptional({ enum: AUDIT_RESOURCE_TYPES, example: 'customer' })
  @IsOptional()
  @IsIn(AUDIT_RESOURCE_TYPES)
  resourceType?: (typeof AUDIT_RESOURCE_TYPES)[number];

  @ApiPropertyOptional({ example: 'cus_01JABCD123' })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trimStringValue(value))
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-01-31T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
