import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, MaxLength, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import {
  WIKI_LIST_DEFAULT_LIMIT,
  WIKI_LIST_MAX_LIMIT,
  WIKI_SEARCH_MAX_LENGTH,
} from './wiki-constants';

export class WikiListQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: WIKI_LIST_MAX_LIMIT, default: WIKI_LIST_DEFAULT_LIMIT })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(WIKI_LIST_MAX_LIMIT)
  limit?: number = WIKI_LIST_DEFAULT_LIMIT;

  @ApiPropertyOptional({ maxLength: WIKI_SEARCH_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({ enum: ['createdAt', 'title'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt', 'title'])
  sort?: 'createdAt' | 'title' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';
}

export class WikiAuthorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string;
}

export class WikiListItemRevisionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty({ nullable: true, type: String })
  summary_vi!: string | null;

  @ApiProperty({ nullable: true, type: WikiAuthorDto })
  author!: WikiAuthorDto | null;

  @ApiProperty()
  createdAt!: Date;
}

export class WikiListItemDto {
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

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true, type: WikiListItemRevisionDto })
  latestRevision!: WikiListItemRevisionDto | null;
}

export class WikiListResponseDto {
  @ApiProperty({ type: [WikiListItemDto] })
  items!: WikiListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}
