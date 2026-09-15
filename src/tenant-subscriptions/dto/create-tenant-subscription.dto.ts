import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export class CreateTenantSubscriptionDto {
  @ApiProperty({ example: 1, description: 'ID of the Tenant (School)' })
  @IsInt()
  @IsNotEmpty()
  tenantId: number;

  @ApiProperty({ example: 2, description: 'ID of the Subscription Plan' })
  @IsInt()
  @IsNotEmpty()
  planId: number;

  @ApiProperty({
    example: '2023-10-01T00:00:00Z',
    description: 'Start date of the subscription',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: '2023-11-01T00:00:00Z',
    description: 'End date of the subscription',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    example: 'active',
    enum: SubscriptionStatus,
    description: 'Current status of the subscription',
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: string = SubscriptionStatus.ACTIVE;
}
