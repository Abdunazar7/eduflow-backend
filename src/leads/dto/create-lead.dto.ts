import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeadDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Tenant ID (Platform Admin only. Automatically resolved for others)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name or first name of the lead',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    example: '+998901234567',
    description: 'Contact phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    example: 'Instagram Ads',
    description: 'Source of the lead',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID of the Lead Status (Kanban column)',
  })
  @IsInt()
  @IsOptional()
  statusId?: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'ID of the User (Manager/Admin) handling this lead',
  })
  @IsInt()
  @IsOptional()
  assignedTo?: number;
}
