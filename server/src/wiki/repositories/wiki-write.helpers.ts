import { BadRequestException } from '@nestjs/common';
import { slugRejectionReason } from '../dto/wiki-slug.validator';

export function isWikiSlugUniqueError(err: any): boolean {
  if (err?.code !== '23505' && err?.driverError?.code !== '23505') return false;
  const constraint = err?.constraint ?? err?.driverError?.constraint ?? '';
  return (
    constraint === 'WikiPage_slug_key' ||
    constraint === 'WikiPage_slug_vi_key' ||
    constraint === 'WikiPage_slugVi_key'
  );
}

export function validateSlugOrThrow(slug: string): void {
  const reason = slugRejectionReason(slug);
  if (reason === 'reserved')
    throw new BadRequestException('wiki.reserved_slug');
  if (reason === 'invalid') throw new BadRequestException('wiki.invalid_slug');
}

export function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
