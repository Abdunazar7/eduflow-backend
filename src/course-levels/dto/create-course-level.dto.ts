import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCourseLevelDto {
  @ApiProperty({ example: 1, description: 'ID of the parent Course' })
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @ApiProperty({ example: 'Beginner', description: 'Name of the level' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 1,
    description: 'Sequence order of the level (e.g., 1 for first level)',
  })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  orderIndex: number;

  @ApiProperty({
    example: 500000,
    description: 'Price of the level in base currency',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiPropertyOptional({
    example: 3,
    default: 3,
    description: 'Duration in months',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMonths?: number;
}
