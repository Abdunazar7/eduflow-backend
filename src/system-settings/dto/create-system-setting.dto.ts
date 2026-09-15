import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSystemSettingDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Tenant ID (Required for Platform Admin. Managers will use their own automatically)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional({
    example: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
    description: 'Telegram Bot Token for notifications',
  })
  @IsString()
  @IsOptional()
  telegramBotToken?: string;

  @ApiPropertyOptional({
    example: 'sk_live_1234567890',
    description: 'API Token for the SMS Provider',
  })
  @IsString()
  @IsOptional()
  smsProviderToken?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logo.png',
    description: 'Custom logo URL for the tenant',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;
}
