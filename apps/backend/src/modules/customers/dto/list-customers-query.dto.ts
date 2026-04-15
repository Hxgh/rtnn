import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const statuses: CustomerStatus[] = ['active', 'inactive', 'blocked'];

export class ListCustomersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: statuses, example: 'active' })
  @IsOptional()
  @IsIn(statuses)
  status?: CustomerStatus;

  @ApiPropertyOptional({ example: 'group_01' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ example: 'tag_01' })
  @IsOptional()
  @IsString()
  tagId?: string;
}
