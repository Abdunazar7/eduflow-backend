import { Module } from '@nestjs/common';
import { SmsLogsService } from './sms-logs.service';
import { SmsLogsController } from './sms-logs.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SmsLogsController],
  providers: [SmsLogsService],
  exports: [SmsLogsService],
})
export class SmsLogsModule {}
