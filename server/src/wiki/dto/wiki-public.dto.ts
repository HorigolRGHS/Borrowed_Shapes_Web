// server/src/wiki/dto/wiki-public.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { WikiAuthorDto } from './wiki-list.dto';
import { WikiMetadataDto } from './wiki-metadata.dto';

// All string fields below carry the value for the resolved locale only.
// No `*Vi` keys are present; the other language is omitted entirely.

export class WikiPublicListItemRevisionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty({ nullable: true, type: WikiAuthorDto })
  author!: WikiAuthorDto | null;

  @ApiProperty()
  createdAt!: Date;
}

export class WikiPublicListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true, type: WikiPublicListItemRevisionDto })
  latestRevision!: WikiPublicListItemRevisionDto | null;
}

export class WikiPublicListResponseDto {
  @ApiProperty({ type: [WikiPublicListItemDto] })
  items!: WikiPublicListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class WikiPublicDetailRevisionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty({ nullable: true, type: WikiAuthorDto })
  author!: WikiAuthorDto | null;

  @ApiProperty()
  createdAt!: Date;
}

export class WikiPublicDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ type: WikiMetadataDto, nullable: true })
  metadataJson!: WikiMetadataDto | null;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  latestRevision!: WikiPublicDetailRevisionDto;

  @ApiProperty({ enum: ['en', 'vi'] })
  matchedSlugLocale!: 'en' | 'vi';
}
