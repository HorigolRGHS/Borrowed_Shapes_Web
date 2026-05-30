import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum EndSessionStatus {
  FINISHED = 'FINISHED',
  ABANDONED = 'ABANDONED',
  FAILED = 'FAILED',
}

export class EndSessionRequestDto {
  @ApiProperty({ example: 'session_123' })
  @IsString()
  sessionId!: string;

  @ApiProperty({ enum: EndSessionStatus, example: EndSessionStatus.FINISHED })
  @IsEnum(EndSessionStatus)
  status!: EndSessionStatus;
}
