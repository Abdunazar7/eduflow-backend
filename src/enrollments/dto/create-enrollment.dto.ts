import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export enum EnrollmentStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  DROPPED = 'dropped',
  COMPLETED = 'completed',
}

export class CreateEnrollmentDto {
  @ApiProperty({ example: 1, description: 'ID of the Student (User)' })
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @ApiProperty({ example: 2, description: 'ID of the Group' })
  @IsInt()
  @IsNotEmpty()
  groupId: number;

  @ApiProperty({ example: '2023-10-01T00:00:00Z', description: 'Date joined' })
  @IsDateString()
  @IsNotEmpty()
  joinedAt: string;

  @ApiPropertyOptional({
    example: EnrollmentStatus.ACTIVE,
    enum: EnrollmentStatus,
  })
  @IsEnum(EnrollmentStatus)
  @IsOptional()
  status?: string = EnrollmentStatus.ACTIVE;

  @ApiPropertyOptional({
    example: 500000,
    description:
      'Individual contract price for this student. If left empty, system auto-calculates based on Course Level price and Student Discount.',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  contractPrice?: number;
}
