import { Transform, type TransformFnParams } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TEMPLATE_DEFAULTS, TEMPLATE_DISPLAY } from '@rtnn/config';

const trimStringValue = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  @ApiProperty({
    description: 'Login email',
    example: TEMPLATE_DEFAULTS.admin.email,
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
    example: TEMPLATE_DISPLAY.adminAppEn,
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): unknown => trimStringValue(value))
  @IsString()
  displayName?: string;
}
