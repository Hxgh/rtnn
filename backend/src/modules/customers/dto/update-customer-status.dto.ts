import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

const statuses = ['active', 'inactive', 'blocked'] as const;

export class UpdateCustomerStatusDto {
  @ApiProperty({ enum: statuses, example: 'inactive' })
  @Transform(({ value }) => {
    if (value === 'disabled') {
      return 'blocked';
    }
    return value;
  })
  @IsIn(statuses)
  status: (typeof statuses)[number];
}
