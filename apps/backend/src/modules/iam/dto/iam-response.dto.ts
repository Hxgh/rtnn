import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { createPaginatedResponseDto } from '../../../common/dto/paginated-response.dto';

export class PermissionSummaryDto {
  @ApiProperty({ example: 'perm_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'admin:users:view' })
  key: string;

  @ApiProperty({ example: 'View admin users' })
  name: string;

  @ApiPropertyOptional({ example: 'Allows reading admin user profiles' })
  description?: string | null;
}

export class RoleSummaryDto {
  @ApiProperty({ example: 'role_01JABCD123' })
  id: string;

  @ApiPropertyOptional({ example: 'ops-admin' })
  slug?: string;

  @ApiPropertyOptional({ example: 'OPS_ADMIN' })
  code?: string;

  @ApiProperty({ example: 'Operations Admin' })
  name: string;

  @ApiPropertyOptional({ example: 'Can operate day-to-day admin workflows' })
  description?: string | null;

  @ApiPropertyOptional({ example: null })
  tenantId?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['admin:users:view'] })
  permissionKeys?: string[];

  @ApiPropertyOptional({ type: [String], example: ['admin:users:view'] })
  permissions?: string[];

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class AdminUserSummaryDto {
  @ApiProperty({ example: 'acc_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: 'Operations Admin' })
  name: string;

  @ApiProperty({ enum: ['active', 'disabled', 'locked'], example: 'active' })
  status: string;

  @ApiProperty({ type: [String], example: ['Operations Admin'] })
  roles: string[];

  @ApiPropertyOptional({ type: [String], example: ['role_01JABCD123'] })
  roleIds?: string[];

  @ApiProperty({ example: null, nullable: true })
  lastLoginAt: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class AdminUserDetailDto extends AdminUserSummaryDto {
  @ApiProperty({ type: [String], example: ['admin:users:view'] })
  permissions: string[];

  @ApiProperty({ type: [RoleSummaryDto] })
  rolesDetailed: RoleSummaryDto[];
}

export class AdminUserListResponseDto extends createPaginatedResponseDto(
  AdminUserSummaryDto,
) {}

export class RoleListResponseDto extends createPaginatedResponseDto(
  RoleSummaryDto,
) {}
