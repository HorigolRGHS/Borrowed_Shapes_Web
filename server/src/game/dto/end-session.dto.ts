import { IsEnum, IsInt, IsString, Min } from 'class-validator';

export enum EndSessionStatus {
  FINISHED = 'FINISHED',
  ABANDONED = 'ABANDONED',
  FAILED = 'FAILED',
}

export class EndSessionRequestDto {
  @IsString()
  sessionId!: string;

  @IsInt()
  @Min(0)
  completionTimeSec!: number;

  @IsEnum(EndSessionStatus)
  status!: EndSessionStatus;
}
