import { IsInt, Min } from 'class-validator';
import { LobbyIdRequestDto } from './lobby.dto';

export class InitGameRunRequestDto extends LobbyIdRequestDto {
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

export class RunIdResponseDto {
  runId!: string;
}
