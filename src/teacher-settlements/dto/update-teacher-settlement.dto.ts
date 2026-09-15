import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTeacherSettlementDto } from './create-teacher-settlement.dto';

// You cannot change the core identities (tenant/teacher) after creation
export class UpdateTeacherSettlementDto extends PartialType(
  OmitType(CreateTeacherSettlementDto, ['tenantId', 'teacherId'] as const),
) {}
