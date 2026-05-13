import { IsEnum, IsOptional, IsString, IsUrl, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementType } from '../../entities/Achievement';

export class UpdateAchievementDto {
  @ApiPropertyOptional({ example: 'First Win Updated' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Achieved your first victory - updated' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'WIN_FIRST_GAME_V2' })
  @IsOptional()
  @IsString()
  criteriaCode?: string;

  @ApiPropertyOptional({ example: 'https://example.com/badge-updated.png' })
  @IsOptional()
  @IsUrl()
  badgeImageUrl?: string;

  @ApiPropertyOptional({ enum: AchievementType, example: AchievementType.SEASONAL })
  @IsOptional()
  @IsEnum(AchievementType)
  type?: AchievementType;

  @ApiPropertyOptional({ example: '2026-04' })
  @IsOptional()
  @IsString()
  seasonMonth?: string;

  @ApiPropertyOptional({ example: '2027-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}