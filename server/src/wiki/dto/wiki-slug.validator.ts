import {
  WIKI_SLUG_REGEX,
  WIKI_SLUG_MAX_LENGTH,
  RESERVED_SLUGS,
} from './wiki-constants';

export type SlugRejectionReason = 'invalid' | 'reserved';

export function slugRejectionReason(slug: string): SlugRejectionReason | null {
  if (!slug || slug.length === 0 || slug.length > WIKI_SLUG_MAX_LENGTH)
    return 'invalid';
  if (!WIKI_SLUG_REGEX.test(slug)) return 'invalid';
  if (RESERVED_SLUGS.includes(slug)) return 'reserved';
  return null;
}

export function isValidSlug(slug: string): boolean {
  return slugRejectionReason(slug) === null;
}
