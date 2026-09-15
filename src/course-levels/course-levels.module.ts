import { Module } from '@nestjs/common';
import { CourseLevelsService } from './course-levels.service';
import { CourseLevelsController } from './course-levels.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CourseLevelsController],
  providers: [CourseLevelsService],
  exports: [CourseLevelsService],
})
export class CourseLevelsModule {}
