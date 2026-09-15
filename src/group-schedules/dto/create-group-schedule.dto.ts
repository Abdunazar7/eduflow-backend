import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, Max, Min } from 'class-validator';

export class CreateGroupScheduleDto {
  @ApiProperty({ example: 1, description: 'ID of the Group' })
  @IsInt()
  @IsNotEmpty()
  groupId: number;

  @ApiProperty({ example: 1, description: 'Day of week (1=Monday, 7=Sunday)' })
  @IsInt()
  @Min(1)
  @Max(7)
  @IsNotEmpty()
  dayOfWeek: number;

  @ApiProperty({
    example: '1970-01-01T14:00:00.000Z',
    description: 'Start time (date part is usually ignored, only time matters)',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    example: '1970-01-01T16:00:00.000Z',
    description: 'End time',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}
