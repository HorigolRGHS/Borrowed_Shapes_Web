import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateSeasonTeamDto {
	@ApiProperty({
		description: 'Tên team hiển thị',
		example: 'SpeedRunners',
		minLength: 3,
		maxLength: 20,
	})
	@IsString({ message: 'validation.invalid_string' })
	@MinLength(3, { message: 'validation.min_length_3' })
	@MaxLength(20, { message: 'validation.max_length_20' })
	name?: string;
}
