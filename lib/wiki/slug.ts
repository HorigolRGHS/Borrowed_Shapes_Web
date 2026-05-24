import slugifyLib from 'slugify';

const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_MAX_LENGTH = 200;

const RESERVED_SLUGS = new Set([
  'new',
  'admin',
  'search',
  'history',
  'edit',
  'api',
  '_next',
]);

export function slugifyEn(input: string): string {
  return slugifyLib(input, { lower: true, strict: true, trim: true }).slice(0, SLUG_MAX_LENGTH);
}

export function slugifyVi(input: string): string {
  // slugify supports Vietnamese diacritic stripping via the `locale: 'vi'` option.
  return slugifyLib(input, { lower: true, strict: true, trim: true, locale: 'vi' }).slice(0, SLUG_MAX_LENGTH);
}

export interface SlugIssue {
  reason: 'empty' | 'invalid' | 'reserved' | 'too_long';
}

export function checkSlug(slug: string): SlugIssue | null {
  if (!slug || slug.length === 0) return { reason: 'empty' };
  if (slug.length > SLUG_MAX_LENGTH) return { reason: 'too_long' };
  if (!SLUG_REGEX.test(slug)) return { reason: 'invalid' };
  if (RESERVED_SLUGS.has(slug)) return { reason: 'reserved' };
  return null;
}

export function isValidSlug(slug: string): boolean {
  return checkSlug(slug) === null;
}
