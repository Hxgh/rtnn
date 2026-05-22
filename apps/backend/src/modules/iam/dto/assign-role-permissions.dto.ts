import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignRolePermissionsDto {
  @ApiProperty({
    type: [String],
    example: ['admin:dashboard:view', 'admin:users:view'],
  })
  @IsArray()
  @IsString({ each: true })
  permissionKeys: string[];
}
