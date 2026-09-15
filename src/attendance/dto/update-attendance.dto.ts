import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateAttendanceDto } from './create-attendance.dto';

// Cannot change the core link (lesson or student) during an update
export class UpdateAttendanceDto extends PartialType(
  OmitType(CreateAttendanceDto, ['lessonId', 'studentId'] as const),
) {}
