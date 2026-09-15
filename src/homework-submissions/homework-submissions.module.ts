import { Module } from '@nestjs/common';
import { HomeworkSubmissionsService } from './homework-submissions.service';
import { HomeworkSubmissionsController } from './homework-submissions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HomeworkSubmissionsController],
  providers: [HomeworkSubmissionsService],
  exports: [HomeworkSubmissionsService],
})
export class HomeworkSubmissionsModule {}
