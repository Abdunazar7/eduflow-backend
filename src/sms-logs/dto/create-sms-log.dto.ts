import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum SmsStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export class CreateSmsLogDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Tenant ID (Platform Admin only)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({
    example: '+998901234567',
    description: 'Destination Phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'Your verification code is 1234',
    description: 'Content of the SMS',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: SmsStatus.SENT, enum: SmsStatus })
  @IsEnum(SmsStatus)
  @IsOptional()
  status?: string = SmsStatus.SENT;
}
