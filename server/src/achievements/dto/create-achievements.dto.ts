import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementType } from '../../entities/Achievement';

export class CreateAchievementDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: 'First Win' })
  @IsNotEmpty({ message: 'achievements.name_required' })
  @IsString({ message: 'achievements.name_must_be_string' })
  @MaxLength(100, { message: 'achievements.name_max_length' })
  @MinLength(2, { message: 'achievements.name_min_length' })
  name!: string;

  @ApiPropertyOptional({ example: 'Achieved your first victory' })
  @IsOptional()
  @IsString({ message: 'achievements.description_must_be_string' })
  @MaxLength(500, { message: 'achievements.description_max_length' })
  description?: string;

  @ApiProperty({ example: 'WIN_FIRST_GAME' })
  @IsNotEmpty({ message: 'achievements.criteria_code_required' })
  @IsString({ message: 'achievements.criteria_code_must_be_string' })
  @MaxLength(50, { message: 'achievements.criteria_code_max_length' })
  @Matches(/^[A-Z0-9_]+$/, { message: 'achievements.criteria_code_invalid' })
  criteriaCode!: string;

  @ApiProperty({ example: 'https://example.com/badge.png' })
  @IsNotEmpty({ message: 'achievements.badge_image_url_required' })
  @IsString({ message: 'achievements.badge_image_url_invalid' })
  badgeImageUrl!: string;

  @ApiProperty({ enum: AchievementType, example: AchievementType.PERMANENT })
  @IsEnum(AchievementType, { message: 'achievements.invalid_type' })
  @IsNotEmpty({ message: 'achievements.type_required' })
  type!: AchievementType;

  @ApiPropertyOptional({ example: '2026-03-31T23:59:59.000Z' })
  @IsOptional()
  @IsString({ message: 'achievements.season_month_must_be_string' })
  seasonMonth?: string;

}
