import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

// Digits with optional +, spaces or dashes; normalised to digits server-side.
const PHONE_PATTERN = /^\+?[\d\s-]{9,20}$/;
const PHONE_MESSAGE = 'phone must be a phone number, e.g. 998901234567';

export class LoginDto {
  @ApiProperty({ example: '998901234567' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: 'k7Pq9mXa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '998901234567' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class CreateUserByAdminDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '998901234567' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Only read for PLATFORM_ADMIN; everyone else creates users in their own tenant.',
  })
  @IsOptional()
  @IsInt()
  tenantId?: number;
}

export class ResendOtpDto {
  @ApiProperty({ example: '998901234567' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: '998901234567' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: PHONE_MESSAGE })
  phone: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description:
      'The refreshToken returned by /auth/login or the last /auth/refresh.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
