/**
 * UT_01 Validate Wiki Slug — Report5 unit-test cases.
 * Each `it` name carries its UTCID so a run result maps to exactly one reported case.
 * Source under test: slugRejectionReason / isValidSlug in ./wiki-slug.validator
 */
import { isValidSlug, slugRejectionReason } from './wiki-slug.validator';
import { WIKI_SLUG_MAX_LENGTH } from './wiki-constants';

describe('UT_01 Validate Wiki Slug', () => {
  it('UTCID01 - accepts a typical slug dragon-knight-2', () => {
    expect(slugRejectionReason('dragon-knight-2')).toBeNull();
    expect(isValidSlug('dragon-knight-2')).toBe(true);
  });

  it('UTCID02 - accepts a single-character slug', () => {
    expect(slugRejectionReason('a')).toBeNull();
  });

  it('UTCID03 - accepts a slug at exactly the max length', () => {
    expect(WIKI_SLUG_MAX_LENGTH).toBe(200);
    expect(slugRejectionReason('a'.repeat(WIKI_SLUG_MAX_LENGTH))).toBeNull();
  });

  it('UTCID04 - rejects a slug one character over the max length as invalid', () => {
    expect(slugRejectionReason('a'.repeat(WIKI_SLUG_MAX_LENGTH + 1))).toBe(
      'invalid',
    );
  });

  it('UTCID05 - rejects an empty slug as invalid', () => {
    expect(slugRejectionReason('')).toBe('invalid');
  });

  it('UTCID06 - rejects a slug containing uppercase letters as invalid', () => {
    expect(slugRejectionReason('Dragon')).toBe('invalid');
  });

  it('UTCID07 - rejects a slug containing a space as invalid', () => {
    expect(slugRejectionReason('dragon knight')).toBe('invalid');
  });

  it('UTCID08 - rejects a slug containing a punctuation character as invalid', () => {
    expect(slugRejectionReason('dragon!')).toBe('invalid');
  });

  it('UTCID09 - rejects a slug containing Vietnamese diacritics as invalid', () => {
    expect(slugRejectionReason('hiệp-sĩ')).toBe('invalid');
  });

  it('UTCID10 - rejects the reserved slug admin as reserved', () => {
    expect(slugRejectionReason('admin')).toBe('reserved');
  });

  it('UTCID11 - rejects the reserved slug api as reserved', () => {
    expect(slugRejectionReason('api')).toBe('reserved');
  });

  it('UTCID14 - rejects the reserved slug _next as invalid because of its underscore', () => {
    // The character rule runs before the reserved list, so this entry is never
    // reported as reserved.
    expect(slugRejectionReason('_next')).toBe('invalid');
  });

  it('UTCID12 - accepts a slug that starts with a digit', () => {
    expect(slugRejectionReason('1abc')).toBeNull();
  });

  it('UTCID13 - rejects a reserved slug padded with spaces as invalid, not reserved', () => {
    // No auto-trim: the padded value fails the character regex before the reserved check.
    expect(slugRejectionReason(' admin ')).toBe('invalid');
  });

  it('UTCID15 - rejects the reserved slug new as reserved', () => {
    expect(slugRejectionReason('new')).toBe('reserved');
  });

  it('UTCID16 - rejects a slug containing an underscore as invalid', () => {
    expect(slugRejectionReason('dragon_knight')).toBe('invalid');
  });
});
