import { Module } from '@nestjs/common';
import { AichatService } from './aichat.service';
import { AichatController } from './aichat.controller';
import { AiQuotaService } from './ai-quota.service';

@Module({
  controllers: [AichatController],
  providers: [AichatService, AiQuotaService],
})
export class AichatModule {}
