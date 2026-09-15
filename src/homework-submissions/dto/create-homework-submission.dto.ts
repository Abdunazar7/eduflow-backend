import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHomeworkSubmissionDto {
  @ApiProperty({ example: 1, description: 'ID of the Homework' })
  @IsInt()
  @IsNotEmpty()
  homeworkId: number;

  @ApiProperty({
    example: 5,
    description: 'ID of the Student submitting the work',
  })
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @ApiPropertyOptional({
    example: '/uploads/170123456-homework.pdf',
    description: 'URL to the submitted file',
  })
  @IsString()
  @IsOptional()
  fileUrl?: string;
}
