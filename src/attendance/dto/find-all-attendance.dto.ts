import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllAttendanceDto {
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

  @ApiPropertyOptional({ description: 'Filter by Lesson ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lessonId?: number;

  @ApiPropertyOptional({ description: 'Filter by Student ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;
}
