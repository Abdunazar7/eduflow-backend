import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateLeadStatusDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Tenant ID (Platform Admin only. Leave empty for Global statuses)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({
    example: 'New Lead',
    description: 'Name of the status/kanban column',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Order index for Kanban board sorting',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}
