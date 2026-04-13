import { ApiProperty } from '@nestjs/swagger';

export class CustomerSessionUserDto {
  @ApiProperty({ example: 'acc_01JABCD123' })
  id: string;

  @ApiProperty({ example: 'customer@rtnn.local' })
  email: string;

  @ApiProperty({ example: 'Template Customer' })
  name: string;

  @ApiProperty({
    enum: ['customer'],
    example: 'customer',
    description: 'Session audience',
  })
  audience: 'customer';

  @ApiProperty({
    type: [String],
    example: ['customer-default'],
    description: 'Current user roles',
  })
  roles: string[];

  @ApiProperty({
    type: [String],
    example: ['customer:self:view', 'customer:self:update'],
    description: 'Current user permissions',
  })
  permissions: string[];
}
