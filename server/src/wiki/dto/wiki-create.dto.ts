import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  WIKI_TITLE_MAX_LENGTH,
  WIKI_SUMMARY_MAX_LENGTH,
  WIKI_CONTENT_MAX_LENGTH,
} from './wiki-constants';
import { isValidSlug, slugRejectionReason } from './wiki-slug.validator';

@ValidatorConstraint({ name: 'wikiSlug', async: false })
export class WikiSlugConstraint implements ValidatorConstraintInterface {
  validate(value: any) {
    return typeof value === 'string' && isValidSlug(value);
  }
  defaultMessage(args: ValidationArguments) {
    const reason = typeof args.value === 'string' ? slugRejectionReason(args.value) : 'invalid';
    return reason === 'reserved' ? 'wiki.reserved_slug' : 'wiki.invalid_slug';
  }
}

export class WikiCreateRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Validate(WikiSlugConstraint)
  slug!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Validate(WikiSlugConstraint)
  slug_vi!: string;

  @ApiProperty({ maxLength: WIKI_TITLE_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(WIKI_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty({ maxLength: WIKI_TITLE_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(WIKI_TITLE_MAX_LENGTH)
  title_vi!: string;

  @ApiProperty({ maxLength: WIKI_CONTENT_MAX_LENGTH })
  @IsString()
  @MaxLength(WIKI_CONTENT_MAX_LENGTH)
  content!: string;

  @ApiProperty({ maxLength: WIKI_CONTENT_MAX_LENGTH })
  @IsString()
  @MaxLength(WIKI_CONTENT_MAX_LENGTH)
  content_vi!: string;

  @ApiPropertyOptional({ maxLength: WIKI_SUMMARY_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_SUMMARY_MAX_LENGTH)
  summary?: string;

  @ApiPropertyOptional({ maxLength: WIKI_SUMMARY_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_SUMMARY_MAX_LENGTH)
  summary_vi?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  metadataJson?: unknown;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
