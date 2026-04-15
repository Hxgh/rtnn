import { ApiProperty } from '@nestjs/swagger';
import { CustomerSessionUserDto } from './customer-session-user.dto';

export class CustomerMeResponseDto {
  @ApiProperty({ type: CustomerSessionUserDto })
  user: CustomerSessionUserDto;
}
