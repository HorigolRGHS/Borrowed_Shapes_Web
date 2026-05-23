import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ArrayMaxSize,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const WIKI_CATEGORIES = [
  'Character',
  'Item',
  'Map',
  'Mechanic',
  'Boss',
  'Other',
] as const;
export type WikiCategory = (typeof WIKI_CATEGORIES)[number];

@ValidatorConstraint({ name: 'finiteNumberStats', async: false })
export class FiniteNumberStatsConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value !== 'object' || Array.isArray(value)) return false;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const trimmed = k.trim();
      if (trimmed.length === 0 || trimmed.length > 40) return false;
      if (typeof v !== 'number' || !Number.isFinite(v)) return false;
    }
    return true;
  }
  defaultMessage(): string {
    return 'stats must be a record of non-empty string keys to finite numbers';
  }
}

export class WikiMetadataDto {
  @ApiPropertyOptional({ enum: WIKI_CATEGORIES })
  @IsOptional()
  @IsEnum(WIKI_CATEGORIES)
  category?: WikiCategory;

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [String], maxItems: 20 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags_vi?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  infoboxImage?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  @Validate(FiniteNumberStatsConstraint)
  stats?: Record<string, number>;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  location_vi?: string;

  @ApiPropertyOptional({ type: [String], maxItems: 30 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  relatedPages?: string[];
}

export class RelatedPageDto {
  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  title_vi?: string;

  @ApiProperty()
  exists!: boolean;
}
