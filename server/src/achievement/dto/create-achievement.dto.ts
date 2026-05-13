import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementType } from '../../entities/Achievement';

export class CreateAchievementDto {
  @ApiProperty({ example: 'First Win' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Achieved your first victory' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'WIN_FIRST_GAME' })
  @IsNotEmpty()
  @IsString()
  criteriaCode!: string;

  @ApiProperty({ example: 'https://example.com/badge.png' })
  @IsNotEmpty()
  @IsUrl()
  badgeImageUrl!: string;

  @ApiProperty({ enum: AchievementType, example: AchievementType.PERMANENT })
  @IsEnum(AchievementType)
  type!: AchievementType;

  @ApiPropertyOptional({ example: '2026-03' })
  @IsOptional()
  @IsString()
  seasonMonth?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}