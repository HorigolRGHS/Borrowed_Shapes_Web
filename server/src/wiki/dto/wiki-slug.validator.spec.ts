import { isValidSlug } from './wiki-slug.validator';

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
