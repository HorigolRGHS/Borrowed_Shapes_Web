export const WIKI_SLUG_REGEX = /^[a-z0-9-]+$/;
export const WIKI_SLUG_MAX_LENGTH = 200;
export const WIKI_TITLE_MAX_LENGTH = 300;
export const WIKI_SUMMARY_MAX_LENGTH = 500;
export const WIKI_CONTENT_MAX_LENGTH = 1_000_000; // 1MB markdown
export const WIKI_METADATA_MAX_BYTES = 100_000; // ~100KB serialized
export const WIKI_STATS_MAX_KEYS = 50;
export const WIKI_SEARCH_MAX_LENGTH = 500;
export const WIKI_LIST_DEFAULT_LIMIT = 20;
export const WIKI_LIST_MAX_LIMIT = 50;

export const RESERVED_SLUGS = [
  'new',
  'admin',
  'search',
  'history',
  'edit',
  'api',
  '_next',
];

export const MIME_EXT_MAP = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
} as const;

export type AllowedMimeType = keyof typeof MIME_EXT_MAP;

export const ALLOWED_UPLOAD_MIMES = Object.keys(
  MIME_EXT_MAP,
) as AllowedMimeType[];

export const UPLOAD_MAX_SIZE = 5 * 1024 * 1024; // 5 MiB
