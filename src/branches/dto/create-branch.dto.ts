import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Tenant ID (Faqat Platform Admin yuborishi shart, qolganlar uchun tokendan olinadi)',
  })
  @IsInt()
  @IsOptional()
  tenantId?: number;

  @ApiProperty({ example: 'Asosiy Filial', description: 'Filial nomi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "Amir Temur ko'chasi, 15",
    description: 'Filial manzili',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    example: '+998712000000',
    description: 'Filial telefon raqami',
  })
  @IsString()
  @IsOptional()
  phone?: string;
}
