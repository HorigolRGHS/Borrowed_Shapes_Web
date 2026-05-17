import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSeasonTeamDto {
	@ApiPropertyOptional({
		description: 'Tên team hiển thị',
		example: 'SpeedRunners',
		maxLength: 50,
	})
	@IsOptional()
	@IsString({ message: 'validation.invalid_string' })
	@MaxLength(50, { message: 'validation.max_length_50' })
	name?: string;
}
