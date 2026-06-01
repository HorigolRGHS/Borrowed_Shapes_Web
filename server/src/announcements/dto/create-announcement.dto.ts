import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  Matches,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { AnnouncementType } from '../../entities/AnnouncementType';

export class CreateAnnouncementDto {
  @ApiProperty({ maxLength: 300 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  title!: string;

  @ApiProperty({ maxLength: 300 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  title_vi!: string;

  @ApiProperty({ maxLength: 200 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, { message: 'announcements.invalid_slug' })
  slug!: string;

  @ApiProperty({ maxLength: 200 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  @Matches(/^[a-z0-9-]+$/, { message: 'announcements.invalid_slug' })
  slug_vi!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary_vi?: string;

  @ApiProperty({ maxLength: 1_000_000 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1_000_000)
  content!: string;

  @ApiProperty({ maxLength: 1_000_000 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1_000_000)
  content_vi!: string;

  @ApiPropertyOptional({ enum: AnnouncementType, default: AnnouncementType.NEWS })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
