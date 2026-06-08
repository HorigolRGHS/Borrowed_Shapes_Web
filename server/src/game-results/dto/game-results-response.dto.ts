import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsIn, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ListGameResultsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by gameProfileId' })
  @IsOptional()
  @IsString()
  gameProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by completion status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ enum: ['startedAt', 'completedAt', 'totalTimeSec'], default: 'startedAt' })
  @IsOptional()
  @IsIn(['startedAt', 'completedAt', 'totalTimeSec'])
  sortBy?: 'startedAt' | 'completedAt' | 'totalTimeSec' = 'startedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class GameResultPlayerDto {
  @ApiProperty()
  gameProfileId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  isHost!: boolean;

  @ApiProperty()
  joinedAt!: Date;
}

export class GameResultSessionPlayerDto {
  @ApiProperty()
  gameProfileId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  isAbsent!: boolean;

  @ApiPropertyOptional()
  leftAt?: Date;
}

export class GameResultSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  levelName!: string;

  @ApiProperty()
  levelOrder!: number;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional()
  result?: string;

  @ApiPropertyOptional()
  completionTimeSec?: number;

  @ApiProperty()
  startedAt!: Date;

  @ApiPropertyOptional()
  endedAt?: Date;

  @ApiProperty({ type: [GameResultSessionPlayerDto] })
  players!: GameResultSessionPlayerDto[];
}

export class GameResultResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  lobbyCode?: string;

  @ApiPropertyOptional()
  lobbyName?: string;

  @ApiProperty()
  isPrivate!: boolean;

  @ApiProperty()
  totalLevels!: number;

  @ApiProperty()
  isCompleted!: boolean;

  @ApiPropertyOptional()
  totalTimeSec?: number;

  @ApiProperty()
  startedAt!: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty({ type: [GameResultPlayerDto] })
  players!: GameResultPlayerDto[];
}

export class GameResultDetailResponseDto extends GameResultResponseDto {
  @ApiProperty({ type: [GameResultSessionDto] })
  sessions!: GameResultSessionDto[];
}

export class GameResultListResponseDto {
  @ApiProperty({ type: [GameResultResponseDto] })
  items!: GameResultResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class LeaderboardEntryDto {
  @ApiProperty()
  rank!: number;

  @ApiProperty()
  gameProfileId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiProperty()
  totalTimeSec!: number;

  @ApiProperty()
  completedAt!: Date;

  @ApiProperty()
  runId!: string;
}

export class LeaderboardResponseDto {
  @ApiProperty({ type: [LeaderboardEntryDto] })
  items!: LeaderboardEntryDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
