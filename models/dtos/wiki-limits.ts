// Length limits for wiki fields. Must stay in sync with the backend
// `server/src/wiki/dto/wiki-constants.ts` (separate app, can't import across).
export const WIKI_TITLE_MAX_LENGTH = 300;
export const WIKI_SUMMARY_MAX_LENGTH = 500;
export const WIKI_CONTENT_MAX_LENGTH = 1_000_000; // 1MB markdown/HTML
