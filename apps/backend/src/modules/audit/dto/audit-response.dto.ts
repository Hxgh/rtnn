import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AUDIT_CATEGORIES,
  AUDIT_OUTCOMES,
  AUDIT_RESOURCE_TYPES,
} from '@rtnn/shared-types';
import { createPaginatedResponseDto } from '../../../common/dto/paginated-response.dto';

export class AuditLogItemDto {
  @ApiProperty({ example: 'aud_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'admin.user.update' })
  action: string;

  @ApiProperty({ enum: AUDIT_CATEGORIES, example: 'iam' })
  category: string;

  @ApiProperty({ enum: AUDIT_OUTCOMES, example: 'success' })
  outcome: string;

  @ApiProperty({ enum: ['admin', 'customer', 'system'], example: 'admin' })
  actorType: string;

  @ApiPropertyOptional({ example: 'acc_01JABCD123', nullable: true })
  actorId?: string | null;

  @ApiProperty({ example: 'Operations Admin' })
  actorName: string;

  @ApiProperty({ enum: AUDIT_RESOURCE_TYPES, example: 'admin-user' })
  resourceType: string;

  @ApiPropertyOptional({ example: 'acc_01JABCD123', nullable: true })
  resourceId?: string | null;

  @ApiPropertyOptional({ example: 'admin@rtnn.local', nullable: true })
  resourceName?: string | null;

  @ApiPropertyOptional({ example: 'req_01JABCD123', nullable: true })
  requestId?: string | null;

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  detail?: Record<string, unknown> | null;

  @ApiProperty({ example: 1 })
  schemaVersion: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;
}

export class AuditLogListResponseDto extends createPaginatedResponseDto(
  AuditLogItemDto,
) {}
