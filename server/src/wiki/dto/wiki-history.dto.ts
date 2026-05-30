import { ApiProperty } from '@nestjs/swagger';
import { WikiAuthorDto } from './wiki-list.dto';
import { WikiDetailRevisionDto } from './wiki-detail.dto';

export class WikiHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  title_vi!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  slug_vi!: string;

  @ApiProperty({ nullable: true, type: Object })
  metadataJson!: Record<string, unknown> | null;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty({ nullable: true, type: String })
  summary_vi!: string | null;

  @ApiProperty({ nullable: true, type: WikiAuthorDto })
  author!: WikiAuthorDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  isLatest!: boolean;
}

export class WikiHistoryResponseDto {
  @ApiProperty({ type: [WikiHistoryItemDto] })
  items!: WikiHistoryItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class WikiDiffChunkDto {
  @ApiProperty({ enum: ['add', 'remove', 'equal'] })
  type!: 'add' | 'remove' | 'equal';

  @ApiProperty()
  value!: string;

  @ApiProperty()
  count!: number;
}

export class WikiRevisionDiffResponseDto {
  @ApiProperty()
  current!: WikiDetailRevisionDto;

  @ApiProperty({ nullable: true, type: WikiDetailRevisionDto })
  previous!: WikiDetailRevisionDto | null;

  @ApiProperty()
  isFirst!: boolean;

  @ApiProperty({ nullable: true })
  diff!: { en: WikiDiffChunkDto[]; vi: WikiDiffChunkDto[] } | null;
}
