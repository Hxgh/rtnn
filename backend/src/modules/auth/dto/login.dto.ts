import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const trimStringValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  @ApiProperty({
    description: 'Login email',
    example: 'admin@rtnn.local',
  })
  @Transform(({ value }: TransformFnParams): unknown => trimStringValue(value))
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password for login',
    minLength: 8,
    example: 'Admin123!@#',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Optional display name metadata',
    example: 'Rtnn Admin',
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trimStringValue(value))
  @IsString()
  displayName?: string;
}
