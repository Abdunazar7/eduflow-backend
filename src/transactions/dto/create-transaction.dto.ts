import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  PaymentMethod,
  TransactionCategory,
  TransactionStatus,
  TransactionType,
} from '../enums/transaction.enums';

// Re-exported so existing imports from this file keep working.
export { PaymentMethod, TransactionCategory, TransactionStatus, TransactionType };

export class CreateTransactionDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Tenant ID (Platform Admin only)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'ID of the Student/Teacher related to this transaction',
  })
  @IsInt()
  @IsOptional()
  userId?: number;

  @ApiProperty({
    example: 500000,
    description: 'Transaction amount in base currency',
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiPropertyOptional({ enum: TransactionCategory })
  @IsEnum(TransactionCategory)
  @IsOptional()
  category?: TransactionCategory;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    example: 'INV-2026-001',
    description: 'External invoice number for this transaction',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  invoiceNumber?: string;

  @ApiPropertyOptional({
    enum: TransactionStatus,
    description: 'Payment status. Defaults to PAID. (Was called status1.)',
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @ApiPropertyOptional({
    description: 'Optional due date for the payment (ISO date string)',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
