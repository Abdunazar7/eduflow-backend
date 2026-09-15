import { Module } from '@nestjs/common';
import { AichatService } from './aichat.service';
import { AichatController } from './aichat.controller';

@Module({
  controllers: [AichatController],
  providers: [AichatService],
})
export class AichatModule {}
