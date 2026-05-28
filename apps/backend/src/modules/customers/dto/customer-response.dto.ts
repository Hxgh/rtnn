import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createPaginatedResponseDto } from '../../../common/dto/paginated-response.dto';

export class LabeledReferenceDto {
  @ApiProperty({ example: 'grp_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'VIP Customers' })
  name: string;
}

export class CustomerSummaryDto {
  @ApiProperty({ example: 'cus_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'acc_01JABCD123' })
  accountId: string;

  @ApiProperty({ example: 'customer@example.com' })
  email: string;

  @ApiProperty({ example: 'Customer Name' })
  name: string;

  @ApiProperty({ enum: ['active', 'inactive', 'blocked'], example: 'active' })
  status: string;

  @ApiProperty({ example: null, nullable: true })
  tenantId: string | null;

  @ApiPropertyOptional({ example: '+1-555-0100', nullable: true })
  phone?: string | null;

  @ApiProperty({ type: [LabeledReferenceDto] })
  groups: LabeledReferenceDto[];

  @ApiProperty({ type: [LabeledReferenceDto] })
  tags: LabeledReferenceDto[];

  @ApiPropertyOptional({ type: [String], example: ['VIP Customers'] })
  groupNames?: string[];

  @ApiPropertyOptional({ type: [String], example: ['High value'] })
  tagNames?: string[];

  @ApiProperty({ example: null, nullable: true })
  lastLoginAt: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class CustomerDetailDto extends CustomerSummaryDto {
  @ApiPropertyOptional({ example: null, nullable: true })
  notes?: string | null;
}

export class CustomerGroupSummaryDto {
  @ApiProperty({ example: 'grp_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'VIP Customers' })
  name: string;

  @ApiPropertyOptional({ example: 'Customers with higher support priority' })
  description?: string;

  @ApiPropertyOptional({ example: 3 })
  memberCount?: number;

  @ApiPropertyOptional({ example: 3 })
  customerCount?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class CustomerTagSummaryDto {
  @ApiProperty({ example: 'tag_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'High value' })
  name: string;

  @ApiPropertyOptional({ example: '#0ea5e9', nullable: true })
  color?: string | null;

  @ApiPropertyOptional({ example: 5 })
  usageCount?: number;

  @ApiPropertyOptional({ example: 5 })
  customerCount?: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class CustomerListResponseDto extends createPaginatedResponseDto(
  CustomerSummaryDto,
) {}

export class CustomerGroupListResponseDto extends createPaginatedResponseDto(
  CustomerGroupSummaryDto,
) {}

export class CustomerTagListResponseDto extends createPaginatedResponseDto(
  CustomerTagSummaryDto,
) {}
