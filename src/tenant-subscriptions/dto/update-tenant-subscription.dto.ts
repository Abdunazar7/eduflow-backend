import { PartialType } from '@nestjs/swagger';
import { CreateTenantSubscriptionDto } from './create-tenant-subscription.dto';

export class UpdateTenantSubscriptionDto extends PartialType(
  CreateTenantSubscriptionDto,
) {}
