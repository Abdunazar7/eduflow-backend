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
import { GroupStatus } from './create-group.dto';

export class FindAllGroupsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search by group name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by Teacher ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;

  @ApiPropertyOptional({ description: 'Filter by Course Level ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courseLevelId?: number;

  @ApiPropertyOptional({ enum: GroupStatus, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(GroupStatus)
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by Tenant ID (Platform Admin only)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tenantId?: number;
}
