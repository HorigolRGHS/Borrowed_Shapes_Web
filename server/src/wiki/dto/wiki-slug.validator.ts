import {
  WIKI_SLUG_REGEX,
  WIKI_SLUG_MAX_LENGTH,
  RESERVED_SLUGS,
} from './wiki-constants';

export function isValidSlug(slug: string): boolean {
  if (!slug || slug.length === 0) return false;
  if (slug.length > WIKI_SLUG_MAX_LENGTH) return false;
  if (!WIKI_SLUG_REGEX.test(slug)) return false;
  if (RESERVED_SLUGS.includes(slug)) return false;
  return true;
}

export function slugRejectionReason(slug: string): 'invalid' | 'reserved' | null {
  if (!slug || slug.length === 0 || slug.length > WIKI_SLUG_MAX_LENGTH) return 'invalid';
  if (!WIKI_SLUG_REGEX.test(slug)) return 'invalid';
  if (RESERVED_SLUGS.includes(slug)) return 'reserved';
  return null;
}
