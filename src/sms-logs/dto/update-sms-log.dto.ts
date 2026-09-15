import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateSmsLogDto, SmsStatus } from './create-sms-log.dto';
import { IsEnum, IsOptional } from 'class-validator';

// STRICT SECURITY: Phone, Message, and Tenant cannot be altered after the SMS is sent/logged.
export class UpdateSmsLogDto extends PartialType(
  OmitType(CreateSmsLogDto, ['phone', 'message', 'tenantId'] as const),
) {
  @ApiPropertyOptional({
    enum: SmsStatus,
    description: 'Only status can be updated (e.g., via webhook)',
  })
  @IsEnum(SmsStatus)
  @IsOptional()
  status?: string;
}
