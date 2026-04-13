import { IsNotEmpty, IsString } from 'class-validator';

export class StartSessionRequestDto {
  @IsString()
  @IsNotEmpty()
  runId!: string;

  @IsString()
  @IsNotEmpty()
  levelId!: string;
}

export class SessionIdResponseDto {
  sessionId!: string;
}
