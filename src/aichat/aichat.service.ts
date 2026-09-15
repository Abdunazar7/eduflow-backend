import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { CreateAichatDto } from './dto/create-aichat.dto';

// TypeScript interfaces
interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqRequestBody {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface GroqChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
  index: number;
}

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GroqChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AichatResponse {
  reply: string;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// [PARKED FEATURE] This module is not registered in AppModule right now.
// To re-enable: uncomment AichatModule in src/app.module.ts and set GROQ_API_KEY in .env.
@Injectable()
export class AichatService {
  private readonly apiKey = process.env.GROQ_API_KEY ?? '';
  private readonly apiUrl =
    process.env.GROQ_API_URL ??
    'https://api.groq.com/openai/v1/chat/completions';
  private readonly model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
  private readonly systemPrompt =
    'Siz EduFlow LMS yordamchisisiz. Savollarga oʻzbek tilida professional tarzda javob bering.';

  async getAiResponse(dto: CreateAichatDto): Promise<AichatResponse> {
    try {
      if (!dto.message || dto.message.trim().length === 0) {
        throw new BadRequestException('Xabar boʻsh boʻlishi mumkin emas');
      }

      const requestBody: GroqRequestBody = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.systemPrompt,
          },
          {
            role: 'user',
            content: dto.message,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      };

      const response = await axios.post<GroqResponse>(
        this.apiUrl,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new InternalServerErrorException('Groq API-dan xato javob olindi');
      }

      return {
        reply: response.data.choices[0].message.content,
        model: response.data.model,
        tokens: {
          prompt: response.data.usage.prompt_tokens,
          completion: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) {
          throw new InternalServerErrorException(
            'Groq API kalit notoʻgʻri yoki muddati tugagan',
          );
        }
        if (axiosError.response?.status === 429) {
          throw new InternalServerErrorException(
            'Groq API limitiga yetdik. Iltimos, biroz vaqt keyinroq harakat qiling',
          );
        }
        if (axiosError.code === 'ECONNABORTED') {
          throw new InternalServerErrorException(
            'Groq API bilan ulanish vaqti bitdi',
          );
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'AI bilan bogʻlanishda xatolik yuz berdi',
      );
    }
  }
}
