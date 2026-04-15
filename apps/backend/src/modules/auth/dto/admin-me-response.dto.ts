import { ApiProperty } from '@nestjs/swagger';
import { AdminSessionUserDto } from './admin-session-user.dto';

export class AdminMeResponseDto {
  @ApiProperty({ type: AdminSessionUserDto })
  user: AdminSessionUserDto;
}
