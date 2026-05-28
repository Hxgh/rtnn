import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from './pagination-meta.dto';

export function createPaginatedResponseDto<TItem extends new () => object>(
  itemDto: TItem,
) {
  class PaginatedResponseDto {
    @ApiProperty({ type: () => [itemDto] })
    data: InstanceType<TItem>[];

    @ApiProperty({ type: PaginationMetaDto })
    meta: PaginationMetaDto;
  }

  Object.defineProperty(PaginatedResponseDto, 'name', {
    value: `${itemDto.name}PaginatedResponseDto`,
  });

  return PaginatedResponseDto;
}
