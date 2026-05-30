import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class StartSessionRequestDto {
  @ApiProperty({ example: 'run_123' })
  @IsString()
  @IsNotEmpty()
  runId!: string;

  @ApiProperty({ example: 'level_01' })
  @IsString()
  @IsNotEmpty()
  levelId!: string;
}

export class SessionIdResponseDto {
  @ApiProperty({ example: 'session_123' })
  sessionId!: string;
}
