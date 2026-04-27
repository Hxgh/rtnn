import { ApiProperty } from '@nestjs/swagger';
import { ReleaseInfoDto } from './release-info.dto';

export class LivenessResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: '2026-04-27T00:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ type: ReleaseInfoDto })
  release!: ReleaseInfoDto;
}

export class ReadinessResponseDto {
  @ApiProperty({ example: 'ready' })
  status!: 'ready';

  @ApiProperty({ example: 'up' })
  database!: 'up';

  @ApiProperty({ example: '2026-04-27T00:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ type: ReleaseInfoDto })
  release!: ReleaseInfoDto;
}

export class VersionResponseDto extends ReleaseInfoDto {
  @ApiProperty({ example: '2026-04-27T00:00:00.000Z' })
  timestamp!: string;
}
