import { IsNotEmpty, IsString } from 'class-validator';

export class LeaveLobbyParamsRequestDto {
  @IsString()
  @IsNotEmpty()
  lobbyId!: string;
}
