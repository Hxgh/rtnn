import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const adminUserStatuses = ['active', 'disabled', 'locked'] as const;

export class CreateAdminUserDto {
  @ApiProperty({ example: 'ops-admin@rtnn.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'Admin123!@#' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'Operations Admin' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Operations Admin' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: [String], example: ['role_01'] })
  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @ApiPropertyOptional({ enum: adminUserStatuses, example: 'active' })
  @IsOptional()
  @IsIn(adminUserStatuses)
  status?: (typeof adminUserStatuses)[number];

  @ApiPropertyOptional({ example: 'default' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
