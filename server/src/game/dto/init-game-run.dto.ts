import { IsInt, Min } from 'class-validator';
import { LobbyIdDto } from './lobby-id.dto';

export class InitGameRunDto extends LobbyIdDto {
	@IsInt()
	@Min(1)
	totalLevels!: number;

	@IsInt()
	@Min(1)
	minPlayers!: number;

	@IsInt()
	@Min(1)
	maxPlayers!: number;
}
