import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllHomeworkSubmissionsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by Homework ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  homeworkId?: number;

  @ApiPropertyOptional({ description: 'Filter by Student ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @ApiPropertyOptional({
    description: 'Filter by Tenant ID (Platform Admin only)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;
}
