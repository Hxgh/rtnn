import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createPaginatedResponseDto } from '../../../common/dto/paginated-response.dto';

export class AuditLogItemDto {
  @ApiProperty({ example: 'aud_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'admin.user.update' })
  action: string;

  @ApiProperty({ enum: ['admin', 'customer', 'system'], example: 'admin' })
  actorType: string;

  @ApiPropertyOptional({ example: 'acc_01JABCD123', nullable: true })
  actorId?: string | null;

  @ApiProperty({ example: 'Operations Admin' })
  actorName: string;

  @ApiProperty({ example: 'admin-user' })
  resourceType: string;

  @ApiPropertyOptional({ example: 'acc_01JABCD123', nullable: true })
  resourceId?: string | null;

  @ApiPropertyOptional({
    type: Object,
    additionalProperties: true,
    nullable: true,
  })
  detail?: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;
}

export class AuditLogListResponseDto extends createPaginatedResponseDto(
  AuditLogItemDto,
) {}
