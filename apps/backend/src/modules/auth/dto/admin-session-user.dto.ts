import { ApiProperty } from '@nestjs/swagger';

export class AdminSessionUserDto {
  @ApiProperty({ example: 'acc_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: 'Operations Admin' })
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
