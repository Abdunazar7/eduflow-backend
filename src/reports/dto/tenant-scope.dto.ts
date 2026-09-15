import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class TenantScopeDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Required for PLATFORM_ADMIN, who has no tenant of their own. Ignored for everyone else — they always see their own organisation.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenantId?: number;
}
