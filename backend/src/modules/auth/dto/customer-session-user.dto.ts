import { ApiProperty } from '@nestjs/swagger';
import { TEMPLATE_DEFAULTS } from '@rtnn/config';

export class CustomerSessionUserDto {
  @ApiProperty({ example: 'acc_01JABCD123' })
  id: string;

  @ApiProperty({ example: TEMPLATE_DEFAULTS.customer.email })
  email: string;

  @ApiProperty({ example: TEMPLATE_DEFAULTS.customer.displayName })
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
