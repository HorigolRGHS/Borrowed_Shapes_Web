import { AuditSanitizer } from './audit.sanitizer';

describe('AuditSanitizer', () => {
  let sanitizer: AuditSanitizer;

  beforeEach(() => {
    sanitizer = new AuditSanitizer();
  });

  it('should redact sensitive keys case-insensitively', () => {
    const input = {
      user: 'test',
      password: 'password123',
      PASSWORDHASH: 'hash',
      aCceSsToKeN: 'token',
    };
    const result = sanitizer.sanitize(input);
    expect(result.password).toBe('[REDACTED]');
    expect(result.PASSWORDHASH).toBe('[REDACTED]');
    expect(result.aCceSsToKeN).toBe('[REDACTED]');
    expect(result.user).toBe('test');
  });

  it('should redact nested sensitive keys', () => {
    const input = {
      nested: {
        array: [{ secret: 'hidden' }, { normal: 'visible' }],
      },
    };
    const result = sanitizer.sanitize(input);
    expect(result.nested.array[0].secret).toBe('[REDACTED]');
    expect(result.nested.array[1].normal).toBe('visible');
  });

  it('should handle circular references safely', () => {
    const input: any = { a: 1 };
    input.self = input;
    const result = sanitizer.sanitize(input);
    expect(result.a).toBe(1);
    expect(result.self).toBe('[CIRCULAR_REFERENCE]');
  });

  it('should format Date objects to ISO strings', () => {
    const date = new Date('2026-07-15T12:00:00Z');
    const result = sanitizer.sanitize({ createdAt: date });
    expect(result.createdAt).toBe('2026-07-15T12:00:00.000Z');
  });
});
