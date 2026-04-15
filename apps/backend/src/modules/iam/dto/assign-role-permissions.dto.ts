import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class AssignRolePermissionsDto {
  @ApiProperty({
    type: [String],
    example: ['admin:dashboard:view', 'admin:users:view'],
  })
  @IsArray()
  permissionKeys: string[];
}
