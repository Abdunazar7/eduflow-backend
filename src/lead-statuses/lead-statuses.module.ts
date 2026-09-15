import { Module } from '@nestjs/common';
import { LeadStatusesService } from './lead-statuses.service';
import { LeadStatusesController } from './lead-statuses.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LeadStatusesController],
  providers: [LeadStatusesService],
  exports: [LeadStatusesService],
})
export class LeadStatusesModule {}
