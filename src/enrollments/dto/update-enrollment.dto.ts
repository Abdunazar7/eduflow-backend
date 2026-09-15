import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateEnrollmentDto } from './create-enrollment.dto';

// O'zgartirayotganda talaba yoki guruhni almashtirib bo'lmasligi kerak (yangi enrollment qilinadi)
export class UpdateEnrollmentDto extends PartialType(
  OmitType(CreateEnrollmentDto, ['studentId', 'groupId'] as const),
) {}
