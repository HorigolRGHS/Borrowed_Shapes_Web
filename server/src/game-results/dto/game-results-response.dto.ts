import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
  IsBoolean,
  IsDateString,
} from 'class-validator';
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
  @Transform(({ obj, key }) => obj[key] === 'true' || obj[key] === true)
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({
    description: 'Search by lobby name or code (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by visibility' })
  @IsOptional()
  @Transform(({ obj, key }) => obj[key] === 'true' || obj[key] === true)
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({
    description: 'Filter runs started from this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter runs started until this date (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startTo?: string;

  @ApiPropertyOptional({
    enum: ['startedAt', 'completedAt', 'totalTimeSec'],
    default: 'startedAt',
  })
  @IsOptional()
  @IsIn(['startedAt', 'completedAt', 'totalTimeSec'])
  sortBy?: 'startedAt' | 'completedAt' | 'totalTimeSec' = 'startedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Filter search term (q)' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'fastest'], description: 'Sort mode' })
  @IsOptional()
  @IsString()
  @IsIn(['newest', 'oldest', 'fastest'])
  sort?: 'newest' | 'oldest' | 'fastest';
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

  @ApiPropertyOptional({ enum: ['all-time', 'seasonal'], default: 'all-time' })
  @IsOptional()
  @IsIn(['all-time', 'seasonal'])
  scope?: 'all-time' | 'seasonal' = 'all-time';

  @ApiPropertyOptional({ description: 'Season month filter (YYYY-MM). Defaults to current month when scope=seasonal.' })
  @IsOptional()
  @IsString()
  seasonMonth?: string;
}

// ─── Common player DTOs ──────────────────────────────────

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

// ─── Session DTO ─────────────────────────────────────────

export class GameResultSessionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ description: 'Level ID (e.g. lobby, map_01..map_05)' })
  levelId!: string;

  @ApiProperty({ description: 'Display name of the level' })
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

// ─── Game Run response DTOs ──────────────────────────────

export class GameResultResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  lobbyCode?: string;

  @ApiPropertyOptional()
  lobbyName?: string;

  @ApiProperty()
  isPrivate!: boolean;

  @ApiProperty({ description: 'Number of playable levels (excluding lobby)' })
  totalLevels!: number;

  @ApiProperty({ description: 'Total sessions in the run (lobby + levels)' })
  totalSessions!: number;

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

  @ApiPropertyOptional({ type: [GameResultSessionDto] })
  sessions?: GameResultSessionDto[];
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

// ─── Player History DTOs ─────────────────────────────────

export class PlayerInfoDto {
  @ApiProperty()
  gameProfileId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string;
}

export class PlayerStatsDto {
  @ApiProperty()
  totalSessions!: number;

  @ApiProperty()
  totalWins!: number;

  @ApiProperty()
  totalLosses!: number;

  @ApiProperty()
  totalAbandoned!: number;

  @ApiProperty({ description: 'Total play time in seconds' })
  totalPlayTimeSec!: number;
}

export class PlayerHistoryRunDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  lobbyCode?: string;

  @ApiPropertyOptional()
  lobbyName?: string;

  @ApiProperty()
  isPrivate!: boolean;

  @ApiProperty({ description: 'Number of playable levels' })
  totalLevels!: number;

  @ApiProperty({ description: 'Total sessions in the run' })
  totalSessions!: number;

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

  @ApiProperty({ description: 'Role of the player in this run' })
  playerRole!: 'HOST' | 'PLAYER';
}

export class PlayerHistoryResponseDto {
  @ApiProperty()
  playerInfo!: PlayerInfoDto;

  @ApiProperty()
  playerStats!: PlayerStatsDto;

  @ApiProperty({ type: [PlayerHistoryRunDto] })
  items!: PlayerHistoryRunDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

// ─── Leaderboard DTOs ────────────────────────────────────

export class LeaderboardPlayerDto {
  @ApiProperty()
  @IsString()
  displayName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class LeaderboardEntryDto {
  @ApiProperty()
  rank!: number;

  @ApiProperty()
  runId!: string;

  @ApiPropertyOptional()
  lobbyName?: string;

  @ApiProperty()
  totalPlayers!: number;

  @ApiProperty()
  totalTimeSec!: number;

  @ApiProperty()
  completedAt!: Date;

  @ApiPropertyOptional({ type: [LeaderboardPlayerDto] })
  @IsOptional()
  players?: LeaderboardPlayerDto[];
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
