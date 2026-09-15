import { Module } from '@nestjs/common';
import { GroupSchedulesService } from './group-schedules.service';
import { GroupSchedulesController } from './group-schedules.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GroupSchedulesController],
  providers: [GroupSchedulesService],
  exports: [GroupSchedulesService],
})
export class GroupSchedulesModule {}
