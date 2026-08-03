import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsIn,
  IsEnum,
} from 'class-validator';
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

  @ApiPropertyOptional({
    enum: ['createdAt', 'publishedAt', 'updatedAt', 'title'],
    default: 'publishedAt',
  })
  @IsOptional()
  @IsIn(['createdAt', 'publishedAt', 'updatedAt', 'title'])
  sortBy?: 'createdAt' | 'publishedAt' | 'updatedAt' | 'title' = 'publishedAt';

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

// --- Public DTOs (single-language based on Accept-Language) ---

/** Public list item: no content, no id, single-language */
export class AnnouncementPublicListItemDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  summary?: string;

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

/** Public detail: has content, no id, single-language */
export class AnnouncementPublicDetailDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiProperty()
  content!: string;

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

// --- Admin DTOs (dual-language, full data) ---

/** Admin list item: no content, has id, dual-language */
export class AnnouncementAdminListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  slugVi!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  titleVi!: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional()
  summaryVi?: string;

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

/** Admin detail: full data, has id, dual-language, includes content */
export class AnnouncementAdminDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  slugVi!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  titleVi!: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional()
  summaryVi?: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  contentVi!: string;

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

// --- List response wrappers ---

export class AnnouncementPublicListResponseDto {
  @ApiProperty({ type: [AnnouncementPublicListItemDto] })
  items!: AnnouncementPublicListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AnnouncementAdminListResponseDto {
  @ApiProperty({ type: [AnnouncementAdminListItemDto] })
  items!: AnnouncementAdminListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
