import { ApiProperty } from '@nestjs/swagger';
import { TEMPLATE_DEFAULTS, TEMPLATE_DISPLAY } from '@rtnn/config';

export class AdminSessionUserDto {
  @ApiProperty({ example: 'acc_01JABCD123' })
  id: string;

  @ApiProperty({ example: TEMPLATE_DEFAULTS.admin.email })
  email: string;

  @ApiProperty({ example: TEMPLATE_DISPLAY.adminAppEn })
  name: string;

  @ApiProperty({
    enum: ['admin'],
    example: 'admin',
    description: 'Session audience',
  })
  audience: 'admin';

  @ApiProperty({
    type: [String],
    example: ['super-admin'],
    description: 'Current user roles',
  })
  roles: string[];

  @ApiProperty({
    type: [String],
    example: ['admin:access', 'admin:users:view'],
    description: 'Current user permissions',
  })
  permissions: string[];
}
