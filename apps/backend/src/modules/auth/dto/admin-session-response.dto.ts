import { ApiProperty } from '@nestjs/swagger';
import { AuthTokensDto } from './auth-tokens.dto';
import { AdminSessionUserDto } from './admin-session-user.dto';

export class AdminSessionResponseDto {
  @ApiProperty({ type: AdminSessionUserDto })
  user: AdminSessionUserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;
}
