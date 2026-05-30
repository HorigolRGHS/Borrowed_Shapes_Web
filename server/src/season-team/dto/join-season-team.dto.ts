import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class JoinSeasonTeamDto {
  @ApiProperty({
    description: 'Mã team nhận được khi tạo team',
    example: 'AB12CD',
    minLength: 4,
    maxLength: 12,
  })
  @IsString({ message: 'validation.invalid_string' })
  @IsNotEmpty({ message: 'validation.required' })
  @MinLength(4, { message: 'validation.min_length_4' })
  @MaxLength(12, { message: 'validation.max_length_12' })
  code!: string;
}
