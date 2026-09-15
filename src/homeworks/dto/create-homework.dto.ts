import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateHomeworkDto {
  @ApiProperty({ example: 10, description: 'ID of the Lesson' })
  @IsInt()
  @IsNotEmpty()
  lessonId: number;

  @ApiPropertyOptional({ example: 'Complete Exercises 5-10 on page 20' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 10,
    default: 10,
    description: 'Maximum score achievable for this homework',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxScore?: number;
}
