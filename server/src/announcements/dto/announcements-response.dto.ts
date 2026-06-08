import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsIn, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { AnnouncementType } from '../../entities/AnnouncementType';

export class ListAnnouncementsQueryDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: AnnouncementType })
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;

  @ApiPropertyOptional({ enum: ['createdAt', 'publishedAt', 'title'], default: 'publishedAt' })
  @IsOptional()
  @IsIn(['createdAt', 'publishedAt', 'title'])
  sortBy?: 'createdAt' | 'publishedAt' | 'title' = 'publishedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class AnnouncementAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;
}

export class AnnouncementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  slug_vi!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  title_vi!: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional()
  summary_vi?: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  content_vi!: string;

  @ApiProperty({ enum: AnnouncementType })
  type!: AnnouncementType;

  @ApiProperty()
  isPinned!: boolean;

  @ApiProperty()
  isPublished!: boolean;

  @ApiPropertyOptional()
  publishedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  author!: AnnouncementAuthorDto | null;
}

export class AnnouncementListResponseDto {
  @ApiProperty({ type: [AnnouncementResponseDto] })
  items!: AnnouncementResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
