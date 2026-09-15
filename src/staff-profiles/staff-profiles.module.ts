import { Module } from '@nestjs/common';
import { StaffProfilesService } from './staff-profiles.service';
import { StaffProfilesController } from './staff-profiles.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StaffProfilesController],
  providers: [StaffProfilesService],
  exports: [StaffProfilesService],
})
export class StaffProfilesModule {}
