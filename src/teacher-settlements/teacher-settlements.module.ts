import { Module } from '@nestjs/common';
import { TeacherSettlementsService } from './teacher-settlements.service';
import { TeacherSettlementsController } from './teacher-settlements.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeacherSettlementsController],
  providers: [TeacherSettlementsService],
  exports: [TeacherSettlementsService],
})
export class TeacherSettlementsModule {}
