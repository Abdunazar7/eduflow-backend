import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTeacherProfileDto } from './create-teacher-profile.dto';

// Prevent changing the userId once the profile is created
export class UpdateTeacherProfileDto extends PartialType(
  OmitType(CreateTeacherProfileDto, ['userId'] as const),
) {}
