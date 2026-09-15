import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'] as const;

export class CreateNotificationDto {
  @ApiProperty({ example: 1, description: 'Recipient user id' })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'success', enum: NOTIFICATION_TYPES })
  @IsIn(NOTIFICATION_TYPES)
  type: string;

  @ApiProperty({ example: 'To‘lov tasdiqlandi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Sizning 500 000 so‘mlik to‘lovingiz qabul qilindi.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    example: '/student/payments',
    description: 'In-app route the notification opens',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;
}
