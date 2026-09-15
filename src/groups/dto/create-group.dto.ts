import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum GroupStatus {
  RECRUITING = 'recruiting',
  ACTIVE = 'active',
  FINISHED = 'finished',
  ARCHIVED = 'archived',
}

export class CreateGroupDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Tenant ID (Platform Admin only)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID of the Branch' })
  @IsInt()
  @IsOptional()
  branchId?: number;

  @ApiProperty({ example: 2, description: 'ID of the Course Level' })
  @IsInt()
  @IsNotEmpty()
  courseLevelId: number;

  @ApiProperty({ example: 5, description: 'ID of the Main Teacher' })
  @IsInt()
  @IsNotEmpty()
  teacherId: number;

  @ApiPropertyOptional({ example: 6, description: 'ID of the Support Teacher' })
  @IsInt()
  @IsOptional()
  supportTeacherId?: number;

  @ApiProperty({
    example: 'IELTS Beginners - Morning',
    description: 'Name of the group',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: '2023-10-01T00:00:00Z',
    description: 'Start date',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00Z',
    description: 'End date',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    example: GroupStatus.RECRUITING,
    enum: GroupStatus,
  })
  @IsEnum(GroupStatus)
  @IsOptional()
  status?: string = GroupStatus.RECRUITING;

  @ApiPropertyOptional({ example: 3, description: 'ID of the Room' })
  @IsInt()
  @IsOptional()
  roomId?: number;
}
