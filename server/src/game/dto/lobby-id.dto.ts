import { IsNotEmpty, IsString } from 'class-validator';

export class LobbyIdDto {
	@IsString()
	@IsNotEmpty()
	lobbyId!: string;
}
