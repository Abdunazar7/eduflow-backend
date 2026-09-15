import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AichatService, AichatResponse } from './aichat.service';
import { AiQuotaService } from './ai-quota.service';
import { CreateAichatDto } from './dto/create-aichat.dto';
import { GetCurrentUserId } from '../commons/decorators';

/**
 * Only registered when AI_CHAT_ENABLED=true (see AppModule). Login is
 * required like everywhere else; the global guard enforces it.
 */
@ApiTags('AI Chat')
@ApiBearerAuth()
@Controller('aichat')
export class AichatController {
  constructor(
    private readonly aichatService: AichatService,
    private readonly quota: AiQuotaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ask the EduFlow AI assistant',
    description:
      'Each user has a per-minute and a daily message limit (AI_MINUTE_LIMIT, AI_DAILY_LIMIT).',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        reply: 'Salom! Guruhga o‘quvchi qo‘shish uchun…',
        model: 'openai/gpt-oss-120b',
        tokens: { prompt: 120, completion: 180, total: 300 },
        remainingToday: 29,
      },
    },
  })
  @ApiResponse({ status: 429, description: 'This user reached their minute or daily limit' })
  @ApiResponse({ status: 503, description: 'Groq is busy, down, or the key/model is misconfigured' })
  @ApiResponse({ status: 504, description: 'Groq took too long to answer' })
  ask(
    @Body() dto: CreateAichatDto,
    @GetCurrentUserId() userId: number,
  ): Promise<AichatResponse> {
    return this.aichatService.ask(userId, dto.message);
  }

  @Get('quota')
  @ApiOperation({ summary: 'How many AI messages I have left today' })
  @ApiResponse({ status: 200, schema: { example: { remainingToday: 29, dailyLimit: 30 } } })
  remaining(@GetCurrentUserId() userId: number) {
    return this.quota.remaining(userId);
  }
}
