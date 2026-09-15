import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto';

// You cannot change the tenant ownership of a lead once created
export class UpdateLeadDto extends PartialType(
  OmitType(CreateLeadDto, ['tenantId'] as const),
) {}
