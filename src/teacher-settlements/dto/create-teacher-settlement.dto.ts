import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export enum SettlementStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export class CreateTeacherSettlementDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Tenant ID (Platform Admin only)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({ example: 5, description: 'ID of the Teacher User' })
  @IsInt()
  @IsNotEmpty()
  teacherId: number;

  @ApiProperty({
    example: '2023-10-01T00:00:00Z',
    description: 'Month being settled (usually the first day of the month)',
  })
  @IsDateString()
  @IsNotEmpty()
  month: string;

  @ApiPropertyOptional({
    example: 5000000,
    description: 'Calculated salary amount (before deductions/bonuses)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  calculatedAmount?: number;

  @ApiPropertyOptional({
    example: 5000000,
    description: 'Amount actually transferred/paid out',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  paidAmount?: number;

  @ApiPropertyOptional({
    example: SettlementStatus.PENDING,
    enum: SettlementStatus,
  })
  @IsEnum(SettlementStatus)
  @IsOptional()
  status?: string = SettlementStatus.PENDING;
}
