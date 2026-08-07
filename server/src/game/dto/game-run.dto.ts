import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, IsOptional, IsBoolean } from 'class-validator';
import { LobbyIdRequestDto } from './lobby.dto';

export class InitGameRunRequestDto extends LobbyIdRequestDto {
  @ApiProperty({
    example: 'A1B2C3',
    description: 'The code of the lobby',
    required: false,
  })
  @IsString()
  lobbyCode?: string;

  @ApiProperty({
    example: 'My Lobby',
    description: 'The name of the lobby',
    required: false,
  })
  @IsString()
  lobbyName?: string;

  @ApiProperty({
    example: 8,
    minimum: 1,
    description: 'Total number of levels in the run',
  })
  @IsInt()
  @Min(1)
  totalLevels!: number;

  @ApiProperty({
    example: 2,
    minimum: 1,
    description: 'Minimum players required in the lobby',
  })
  @IsInt()
  @Min(1)
  minPlayers!: number;

  @ApiProperty({
    example: 5,
    minimum: 1,
    description: 'Maximum players allowed in the lobby',
  })
  @IsInt()
  @Min(1)
  maxPlayers!: number;
}

export class RunIdResponseDto {
  @ApiProperty({ example: 'run_123' })
  runId!: string;
}

export class EndRunRequestDto {
  @ApiProperty({ example: 'run_123' })
  @IsString()
  runId!: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isWin?: boolean;
}
