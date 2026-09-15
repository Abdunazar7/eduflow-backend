import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCourseDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'ID of the Tenant (Platform Admin only. Others will use their own token)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({
    example: 'General English',
    description: 'Name of the course',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Standard English course for all levels' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
