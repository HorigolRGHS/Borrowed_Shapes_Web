import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsDateString, MaxLength, Matches, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementType } from '../../entities/Achievement';

export class CreateAchievementDto {
  @ApiProperty({ example: 'First Win' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({ example: 'Achieved your first victory' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 'WIN_FIRST_GAME' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, { message: 'Criteria code must contain only uppercase letters, numbers, and underscores' })
  criteriaCode!: string;

  @ApiProperty({ example: 'https://example.com/badge.png' })
  @IsNotEmpty()
  @IsUrl()
  badgeImageUrl!: string;

  @ApiProperty({ enum: AchievementType, example: AchievementType.PERMANENT })
  @IsEnum(AchievementType)
  @IsNotEmpty()
  type!: AchievementType;

  @ApiPropertyOptional({ example: '2026-03-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  seasonMonth?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}