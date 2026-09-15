import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateStaffProfileDto } from './create-staff-profile.dto';

// User ID is immutable once the profile is created
export class UpdateStaffProfileDto extends PartialType(
  OmitType(CreateStaffProfileDto, ['userId'] as const),
) {}
