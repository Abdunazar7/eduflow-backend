import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllGroupSchedulesDto {
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
  limit?: number = 50; // Higher default limit since schedules are small

  @ApiPropertyOptional({ description: 'Filter by Group ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional({
    description: 'Filter by Tenant ID (Platform Admin only)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;
}
