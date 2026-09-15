import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, ValidateNested } from 'class-validator';
import { CreateAttendanceDto } from './create-attendance.dto';

export class BulkAttendanceDto {
  @ApiProperty({ example: 10, description: 'ID of the Lesson' })
  @IsInt()
  @IsNotEmpty()
  lessonId: number;

  @ApiProperty({
    type: [CreateAttendanceDto],
    description: 'Array of student attendance records',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttendanceDto)
  records: CreateAttendanceDto[];
}
