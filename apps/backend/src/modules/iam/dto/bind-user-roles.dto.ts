import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';

export class BindUserRolesDto {
  @ApiProperty({ type: [String], example: ['super-admin'], required: false })
  @IsOptional()
  @IsArray()
  roleSlugs?: string[];

  @ApiProperty({ type: [String], example: ['role_01'], required: false })
  @IsOptional()
  @IsArray()
  roleIds?: string[];
}
