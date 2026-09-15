import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

export class CreateAttendanceDto {
  @ApiProperty({ example: 10, description: 'ID of the Lesson' })
  @IsInt()
  @IsNotEmpty()
  lessonId: number;

  @ApiProperty({ example: 5, description: 'ID of the Student' })
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @ApiProperty({ enum: AttendanceStatus, example: AttendanceStatus.PRESENT })
  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ example: 'Late due to traffic' })
  @IsString()
  @IsOptional()
  comment?: string;
}
