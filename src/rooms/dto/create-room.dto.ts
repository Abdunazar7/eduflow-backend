import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the Branch this room belongs to',
  })
  @IsInt()
  @IsNotEmpty()
  branchId: number;

  @ApiProperty({
    example: 'Room 101',
    description: 'Name or number of the room',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 15,
    default: 15,
    description: 'Student capacity of the room',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
