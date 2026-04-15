import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const actorTypes = ['admin', 'customer', 'system'] as const;

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: actorTypes, example: 'admin' })
  @IsOptional()
  @IsIn(actorTypes)
  actorType?: (typeof actorTypes)[number];

  @ApiPropertyOptional({ example: 'account.password.change' })
  @IsOptional()
  @IsString()
  action?: string;
}
