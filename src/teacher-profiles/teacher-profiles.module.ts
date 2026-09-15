import { Module } from '@nestjs/common';
import { TeacherProfilesService } from './teacher-profiles.service';
import { TeacherProfilesController } from './teacher-profiles.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherProfilesController],
  providers: [TeacherProfilesService],
})
export class TeacherProfilesModule {}
