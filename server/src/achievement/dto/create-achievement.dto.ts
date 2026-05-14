import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsDateString, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AchievementType } from '../../entities/Achievement';

export class CreateAchievementDto {
  @ApiProperty({ example: 'First Win' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Achieved your first victory' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  description!: string;

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

  @ApiPropertyOptional({ example: '2026-03-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  seasonMonth?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}