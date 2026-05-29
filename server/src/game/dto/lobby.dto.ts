import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LobbyIdRequestDto {
  @ApiProperty({ example: 'lobby_123' })
  @IsString()
  @IsNotEmpty()
  lobbyId!: string;
}
