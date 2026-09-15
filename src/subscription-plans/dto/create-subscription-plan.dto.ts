import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Premium Plan' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 500,
    description:
      'Maximum number of students allowed. Leave empty or null for unlimited.',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxStudents?: number;

  @ApiProperty({
    example: 49.99,
    description: 'Monthly price in the base currency',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  monthlyPrice: number;
}
