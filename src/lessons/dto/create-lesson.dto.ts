import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum LessonStatus {
  PLANNED = 'planned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateLessonDto {
  @ApiProperty({ example: 1, description: 'ID of the Group' })
  @IsInt()
  @IsNotEmpty()
  groupId: number;

  @ApiProperty({
    example: '2023-10-05T14:00:00Z',
    description: 'Date and time of the lesson',
  })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiPropertyOptional({
    example: 'Present Perfect Tense',
    description: 'Topic covered in the lesson',
  })
  @IsString()
  @IsOptional()
  topic?: string;

  @ApiPropertyOptional({ enum: LessonStatus, default: LessonStatus.PLANNED })
  @IsEnum(LessonStatus)
  @IsOptional()
  status?: string = LessonStatus.PLANNED;

  @ApiPropertyOptional({
    example: 5,
    description: 'Optional substitute teacher ID',
  })
  @IsInt()
  @IsOptional()
  teacherId?: number;
}
