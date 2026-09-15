import { Module } from '@nestjs/common';
import { StudentProfilesService } from './student-profiles.service';
import { StudentProfilesController } from './student-profiles.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudentProfilesController],
  providers: [StudentProfilesService],
  exports: [StudentProfilesService], // Exported in case other modules need it
})
export class StudentProfilesModule {}
