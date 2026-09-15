import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto';

// Usually, changing the group of an existing lesson causes data corruption.
export class UpdateLessonDto extends PartialType(
  OmitType(CreateLessonDto, ['groupId'] as const),
) {}
