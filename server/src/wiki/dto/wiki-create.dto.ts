import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidateNested,
  IsObject,
} from 'class-validator';
import {
  WIKI_TITLE_MAX_LENGTH,
  WIKI_SUMMARY_MAX_LENGTH,
  WIKI_CONTENT_MAX_LENGTH,
} from './wiki-constants';
import { isValidSlug, slugRejectionReason } from './wiki-slug.validator';
import { WikiMetadataDto } from './wiki-metadata.dto';

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
  @ApiPropertyOptional({ description: 'When true, server generates placeholders for all fields' })
  @IsOptional()
  @IsBoolean()
  stub?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Validate(WikiSlugConstraint)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Validate(WikiSlugConstraint)
  slug_vi?: string;

  @ApiPropertyOptional({ maxLength: WIKI_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional({ maxLength: WIKI_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_TITLE_MAX_LENGTH)
  title_vi?: string;

  @ApiPropertyOptional({ maxLength: WIKI_CONTENT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_CONTENT_MAX_LENGTH)
  content?: string;

  @ApiPropertyOptional({ maxLength: WIKI_CONTENT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_CONTENT_MAX_LENGTH)
  content_vi?: string;

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

  @ApiPropertyOptional({ type: WikiMetadataDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WikiMetadataDto)
  metadataJson?: WikiMetadataDto | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
