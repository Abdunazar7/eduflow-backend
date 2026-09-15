import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { CreateHomeworkSubmissionDto } from './create-homework-submission.dto';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateHomeworkSubmissionDto extends PartialType(
  OmitType(CreateHomeworkSubmissionDto, ['homeworkId', 'studentId'] as const),
) {
  @ApiPropertyOptional({
    example: 9,
    description: 'Score given by the teacher',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  score?: number;
}
