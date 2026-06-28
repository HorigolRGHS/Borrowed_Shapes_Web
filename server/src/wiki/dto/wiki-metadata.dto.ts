import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
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

const wikiImageProxyPath = /^\/api\/wiki\/image\/wiki\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.(?:jpg|png|webp|gif)$/;

@ValidatorConstraint({ name: 'wikiImageUrl', async: false })
export class WikiImageUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value !== 'string') return false;
    if (wikiImageProxyPath.test(value)) return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'infoboxImage must be a URL or wiki image proxy path';
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
  @Validate(WikiImageUrlConstraint)
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
  titleVi?: string;

  @ApiProperty()
  exists!: boolean;
}

/**
 * Drops fields that should not be persisted to JSONB:
 * - empty arrays (tags, tags_vi, relatedPages)
 * - empty stats object
 * - undefined optional scalars
 *
 * Returns null if the result has no remaining keys, so the column stores
 * `null` instead of `{}` when the wiki has no metadata.
 *
 * Mirrors the frontend Zod-schema-derived helper in
 * `models/dtos/wiki-metadata.dto.ts`. Schema parity is enforced by
 * `wiki-metadata.dto.spec.ts`; this helper is duplicated locally so the
 * backend runtime doesn't need to require the frontend module.
 */
export function compactMetadata(
  meta: WikiMetadataDto | null | undefined,
): Partial<WikiMetadataDto> | null {
  if (!meta) return null;
  const out: Partial<WikiMetadataDto> = {};
  if (meta.category) out.category = meta.category;
  if (meta.tags && meta.tags.length > 0) out.tags = meta.tags;
  if (meta.tags_vi && meta.tags_vi.length > 0) out.tags_vi = meta.tags_vi;
  if (meta.infoboxImage) out.infoboxImage = meta.infoboxImage;
  if (meta.stats && Object.keys(meta.stats).length > 0) out.stats = meta.stats;
  if (meta.location) out.location = meta.location;
  if (meta.location_vi) out.location_vi = meta.location_vi;
  if (meta.relatedPages && meta.relatedPages.length > 0) {
    out.relatedPages = meta.relatedPages;
  }
  return Object.keys(out).length === 0 ? null : out;
}
