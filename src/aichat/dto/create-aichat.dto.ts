import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAichatDto {
  @ApiProperty({
    example: 'Guruhga yangi o‘quvchini qanday qo‘shaman?',
    maxLength: 2000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Xabar matn sifatida boʻlishi kerak' })
  @IsNotEmpty({ message: 'Xabar boʻsh boʻlishi mumkin emas' })
  @MaxLength(2000, { message: 'Xabar 2000 belgidan oshmasligi kerak' })
  message: string;
}
