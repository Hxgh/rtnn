import { ApiProperty } from '@nestjs/swagger';
import { AuthTokensDto } from './auth-tokens.dto';
import { CustomerSessionUserDto } from './customer-session-user.dto';

export class CustomerSessionResponseDto {
  @ApiProperty({ type: CustomerSessionUserDto })
  user: CustomerSessionUserDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;
}
