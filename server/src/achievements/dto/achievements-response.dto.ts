import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementType } from '../../entities/Achievement';

export class AchievementResponseDto {
  @ApiProperty({ example: 'uuid-string' })
  id!: string;

  @ApiProperty({ example: 'First Win' })
  name!: string;

  @ApiPropertyOptional({ example: 'Achieved your first victory' })
  description?: string;

  @ApiProperty({ example: 'WIN_FIRST_GAME' })
  criteriaCode!: string;

  @ApiProperty({ example: 'https://example.com/badge.png' })
  badgeImageUrl!: string;

  @ApiProperty({ enum: AchievementType, example: AchievementType.PERMANENT })
  type!: AchievementType;

  @ApiPropertyOptional({ example: '2026-03' })
  seasonMonth?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  expiresAt?: Date;

  @ApiPropertyOptional({ example: 12 })
  earnedCount?: number;
}

export class AchievementUploadResponseDto {
  @ApiProperty({ example: 'https://pub-x.r2.dev/achievement/uuid.png' })
  url!: string;
}
