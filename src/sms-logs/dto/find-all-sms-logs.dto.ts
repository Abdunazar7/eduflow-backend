import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SmsStatus } from './create-sms-log.dto';

export class FindAllSmsLogsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 50;

  @ApiPropertyOptional({
    description: 'Search by exact or partial phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: SmsStatus })
  @IsOptional()
  @IsEnum(SmsStatus)
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by Tenant ID (Platform Admin only)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;
}
