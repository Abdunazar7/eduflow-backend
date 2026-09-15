import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateStudentProfileDto } from './create-student-profile.dto';

// User ID cannot be updated once the profile is created
export class UpdateStudentProfileDto extends PartialType(
  OmitType(CreateStudentProfileDto, ['userId'] as const),
) {}
