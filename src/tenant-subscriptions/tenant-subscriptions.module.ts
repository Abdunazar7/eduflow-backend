import { Module } from '@nestjs/common';
import { TenantSubscriptionsService } from './tenant-subscriptions.service';
import { TenantSubscriptionsController } from './tenant-subscriptions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantSubscriptionsController],
  providers: [TenantSubscriptionsService],
})
export class TenantSubscriptionsModule {}
