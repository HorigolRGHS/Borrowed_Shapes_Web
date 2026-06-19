import { resolveLocale } from './resolve-locale';

describe('resolveLocale', () => {
  it('returns en when header is missing', () => {
    expect(resolveLocale(undefined)).toBe('en');
  });

  it('returns en for empty string', () => {
    expect(resolveLocale('')).toBe('en');
  });

  it('returns vi for "vi"', () => {
    expect(resolveLocale('vi')).toBe('vi');
  });

  it('returns vi for "vi-VN"', () => {
    expect(resolveLocale('vi-VN')).toBe('vi');
  });

  it('returns vi when vi is the first weighted entry', () => {
    expect(resolveLocale('vi-VN,vi;q=0.9,en;q=0.8')).toBe('vi');
  });

  it('returns en for "en-US,en;q=0.9"', () => {
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
  });

  it('returns en for garbage input', () => {
    expect(resolveLocale('!!!')).toBe('en');
  });

  it('is case-insensitive', () => {
    expect(resolveLocale('VI-vn')).toBe('vi');
  });
});
