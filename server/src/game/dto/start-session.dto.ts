import { IsNotEmpty, IsString } from 'class-validator';

export class StartSessionDto {
	@IsString()
	@IsNotEmpty()
	runId!: string;

	@IsString()
	@IsNotEmpty()
	levelId!: string;
}
