import { PartialType } from '@nestjs/swagger';
import { CreateLeadStatusDto } from './create-lead-status.dto';

export class UpdateLeadStatusDto extends PartialType(CreateLeadStatusDto) {}
