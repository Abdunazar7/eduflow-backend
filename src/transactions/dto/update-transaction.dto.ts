import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';

// STRICLY PREVENT altering the core financial data after creation
export class UpdateTransactionDto extends PartialType(
  OmitType(CreateTransactionDto, [
    'amount',
    'type',
    'userId',
    'tenantId',
  ] as const),
) {}
