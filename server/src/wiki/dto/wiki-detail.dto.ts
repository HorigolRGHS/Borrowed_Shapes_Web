import { ApiProperty } from '@nestjs/swagger';
import { WikiAuthorDto } from './wiki-list.dto';
import { WikiMetadataDto } from './wiki-metadata.dto';

export class WikiDetailRevisionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  content!: string;

  @ApiProperty()
  contentVi!: string;

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty({ nullable: true, type: String })
  summaryVi!: string | null;

  @ApiProperty({ nullable: true, type: WikiAuthorDto })
  author!: WikiAuthorDto | null;

  @ApiProperty()
  createdAt!: Date;
}

export class WikiDetailResponseDto {
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

  @ApiProperty({ type: WikiMetadataDto, nullable: true })
  metadataJson!: WikiMetadataDto | null;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  latestRevision!: WikiDetailRevisionDto;

  @ApiProperty({ enum: ['en', 'vi'] })
  matchedSlugLocale!: 'en' | 'vi';
}
