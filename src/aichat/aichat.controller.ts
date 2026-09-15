import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AichatService, AichatResponse } from './aichat.service';
import { CreateAichatDto } from './dto/create-aichat.dto';

@ApiTags('AI Chat')
@Controller('aichat')
export class AichatController {
  constructor(private readonly aichatService: AichatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get response from Groq AI',
    description: 'Send a message to AI assistant powered by Llama 3.3 70B',
  })
  @ApiBody({ type: CreateAichatDto })
  @ApiResponse({
    status: 200,
    description: 'AI response received successfully',
    schema: {
      example: {
        reply: 'Salom! Men EduFlow LMS yordamchisiman...',
        model: 'llama-3.3-70b-versatile',
        tokens: {
          prompt: 45,
          completion: 123,
          total: 168,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (empty message or validation error)',
  })
  @ApiResponse({
    status: 500,
    description: 'Groq API error or server error',
  })
  async create(@Body() createAichatDto: CreateAichatDto): Promise<AichatResponse> {
    return this.aichatService.getAiResponse(createAichatDto);
  }
}
