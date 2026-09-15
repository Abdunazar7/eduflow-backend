import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSystemSettingDto } from './create-system-setting.dto';

// tenantId is the Primary Key in this 1-to-1 relation and cannot be updated.
export class UpdateSystemSettingDto extends PartialType(
  OmitType(CreateSystemSettingDto, ['tenantId'] as const),
) {}
