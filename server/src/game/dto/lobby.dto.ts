import { IsNotEmpty, IsString } from 'class-validator';

export class LobbyIdRequestDto {
  @IsString()
  @IsNotEmpty()
  lobbyId!: string;
}
