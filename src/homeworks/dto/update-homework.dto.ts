import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateHomeworkDto } from './create-homework.dto';

// The lessonId cannot be changed once the homework is created to prevent data corruption.
export class UpdateHomeworkDto extends PartialType(
  OmitType(CreateHomeworkDto, ['lessonId'] as const),
) {}
