import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateAichatDto {
  @IsString({
    message: 'Xabar matn sifatida boʻlishi kerak',
  })
  @IsNotEmpty({
    message: 'Xabar boʻsh boʻlishi mumkin emas',
  })
  @MinLength(1, {
    message: 'Xabar kamida 1 belgini oʻz ichiga olishi kerak',
  })
  @MaxLength(5000, {
    message: 'Xabar 5000 belgidan Koʻp boʻlishi mumkin emas',
  })
  message: string;
}
