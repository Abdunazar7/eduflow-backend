import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateStaffProfileDto {
  @ApiProperty({ example: 1, description: 'ID of the existing User' })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiPropertyOptional({
    example: 'Receptionist',
    description: 'Job title of the staff member',
  })
  @IsString()
  @IsOptional()
  jobTitle?: string;

  @ApiPropertyOptional({
    example: 3000000,
    description: 'Fixed monthly salary in base currency',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fixedSalary?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'KPI percentage bonus (0-100)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  kpiPercent?: number;
}
