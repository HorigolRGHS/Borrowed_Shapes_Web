import { isValidSlug, slugRejectionReason } from './wiki-slug.validator';

describe('isValidSlug', () => {
  it('accepts lowercase, digits, dashes', () => {
    expect(isValidSlug('dragon-knight-2')).toBe(true);
  });

  it('rejects empty', () => {
    expect(isValidSlug('')).toBe(false);
  });

  it('rejects uppercase', () => {
    expect(isValidSlug('Dragon')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(isValidSlug('dragon knight')).toBe(false);
  });

  it('rejects special chars', () => {
    expect(isValidSlug('dragon!')).toBe(false);
  });

  it('rejects too long', () => {
    expect(isValidSlug('a'.repeat(201))).toBe(false);
  });

  it('rejects reserved slugs', () => {
    expect(isValidSlug('new')).toBe(false);
    expect(isValidSlug('admin')).toBe(false);
    expect(isValidSlug('search')).toBe(false);
    expect(isValidSlug('history')).toBe(false);
    expect(isValidSlug('edit')).toBe(false);
    expect(isValidSlug('api')).toBe(false);
    expect(isValidSlug('_next')).toBe(false);
  });
});

describe('slugRejectionReason', () => {
  it('returns null for valid slug', () => {
    expect(slugRejectionReason('dragon-knight')).toBeNull();
  });
  it('returns "reserved" for reserved slug', () => {
    expect(slugRejectionReason('admin')).toBe('reserved');
  });
  it('returns "invalid" for empty string', () => {
    expect(slugRejectionReason('')).toBe('invalid');
  });
  it('returns "invalid" for malformed slug', () => {
    expect(slugRejectionReason('Bad Slug!')).toBe('invalid');
  });
  it('returns "invalid" for too-long slug', () => {
    expect(slugRejectionReason('a'.repeat(201))).toBe('invalid');
  });
});

describe('isValidSlug — Boundary', () => {
  it('accepts a single-char slug', () => {
    expect(isValidSlug('a')).toBe(true);
  });

  it('accepts slug exactly at max length (200 chars)', () => {
    expect(isValidSlug('a'.repeat(200))).toBe(true);
  });

  it('rejects slug one over max length (201 chars)', () => {
    expect(isValidSlug('a'.repeat(201))).toBe(false);
  });

  it('accepts a slug consisting only of dashes', () => {
    // The regex /^[a-z0-9-]+$/ allows dashes, even consecutive ones.
    expect(isValidSlug('---')).toBe(true);
  });

  it('accepts a slug starting with a digit', () => {
    expect(isValidSlug('1abc')).toBe(true);
  });
});

describe('isValidSlug — Abnormal', () => {
  it('returns false for undefined', () => {
    expect(isValidSlug(undefined as unknown as string)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidSlug(null as unknown as string)).toBe(false);
  });

  it('rejects Unicode characters (Vietnamese diacritics)', () => {
    expect(isValidSlug('hiệp-sĩ')).toBe(false);
  });

  it('rejects slugs with leading/trailing whitespace (no auto-trim)', () => {
    expect(isValidSlug(' admin ')).toBe(false);
    expect(isValidSlug(' dragon-knight')).toBe(false);
    expect(isValidSlug('dragon-knight ')).toBe(false);
  });
});
