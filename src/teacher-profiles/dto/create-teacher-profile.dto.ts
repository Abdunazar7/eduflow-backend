import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// Assuming you have this enum, or you can define it here for portability
export enum TeacherTitle {
  MAIN = 'MAIN',
  SUPPORT = 'SUPPORT',
}

export enum SalaryType {
  FIXED = 'FIXED',
  HOURLY = 'HOURLY',
  PERCENTAGE = 'PERCENTAGE',
}

export class CreateTeacherProfileDto {
  @ApiProperty({ example: 1, description: 'ID of the existing User' })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiPropertyOptional({ example: 'Experienced IELTS instructor...' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'English, Math' })
  @IsString()
  @IsOptional()
  specialization?: string;

  @ApiProperty({ example: 'PERCENTAGE', enum: SalaryType })
  @IsEnum(SalaryType)
  @IsNotEmpty()
  salaryType: string;

  @ApiProperty({
    example: 50,
    description: 'Salary value (e.g., fixed amount or 50%)',
  })
  @IsNumber()
  @IsNotEmpty()
  salaryValue: number;

  @ApiPropertyOptional({ example: '2023-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  hiredDate?: string;

  @ApiProperty({ enum: TeacherTitle, example: TeacherTitle.MAIN })
  @IsEnum(TeacherTitle)
  @IsOptional()
  title?: string;
}
