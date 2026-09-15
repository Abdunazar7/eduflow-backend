import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class FindNotificationsDto {
  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Ignored. The list is always the signed-in user’s own notifications; accepted so older clients do not get a 400.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiPropertyOptional({ description: 'true = only read, false = only unread' })
  @IsOptional()
  // Read the raw value: implicit conversion would turn the string "false" into true.
  @Transform(({ obj, key }) => {
    const raw = obj[key];
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return raw;
  })
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    deprecated: true,
    description: 'Ignored; results are always newest first.',
  })
  @IsOptional()
  @IsString()
  orderBy?: string;
}
