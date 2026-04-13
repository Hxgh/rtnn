import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const adminUserStatuses = ['active', 'disabled', 'locked'] as const;

export class UpdateAdminUserDto {
  @ApiPropertyOptional({ example: 'Operations Admin' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 'Operations Admin' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ minLength: 8, example: 'Admin123!@#' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ type: [String], example: ['role_01'] })
  @IsOptional()
  @IsArray()
  roleIds?: string[];

  @ApiPropertyOptional({ enum: adminUserStatuses, example: 'active' })
  @IsOptional()
  @IsIn(adminUserStatuses)
  status?: (typeof adminUserStatuses)[number];
}
