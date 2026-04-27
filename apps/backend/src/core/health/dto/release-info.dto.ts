import { ApiProperty } from '@nestjs/swagger';

export class ReleaseInfoDto {
  @ApiProperty({ example: 'testing' })
  environment!: string;

  @ApiProperty({ example: 'main-bce88fb0a427' })
  version!: string;

  @ApiProperty({
    example: 'bce88fb0a4271ad8180059ab8fc23c0135c8d632',
  })
  sourceSha!: string;

  @ApiProperty({
    example: 'ghcr.io/example/rtnn-backend:main-bce88fb0a427',
  })
  backendImage!: string;
}
