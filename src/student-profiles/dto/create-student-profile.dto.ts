import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateStudentProfileDto {
  @ApiProperty({ example: 1, description: 'User ID of the student' })
  @IsInt()
  userId: number;

  @ApiPropertyOptional({ example: '2005-05-15' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'AA1234567' })
  @IsString()
  @IsOptional()
  passportSeries?: string;

  @ApiPropertyOptional({ example: '123 Main St, Tashkent' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'John Doe Sr.' })
  @IsString()
  @IsOptional()
  parentName?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsString()
  @IsOptional()
  parentPhone?: string;

  @ApiPropertyOptional({ example: 0, description: 'Student balance' })
  @IsNumber()
  @IsOptional()
  balance?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Discount percentage (0-100)',
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @ApiPropertyOptional({ example: 'Allergic to peanuts' })
  @IsString()
  @IsOptional()
  notes?: string;
}
