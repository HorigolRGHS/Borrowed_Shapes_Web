import { Injectable } from '@nestjs/common';
import { SENSITIVE_KEYS } from './constants/audit-entity.constants';

@Injectable()
export class AuditSanitizer {
  private readonly sensitiveKeys = new Set(
    SENSITIVE_KEYS.map((k) => k.toLowerCase()),
  );

  sanitize(
    obj: any,
    maxDepth = 5,
    currentDepth = 0,
    seen = new WeakSet(),
  ): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (currentDepth >= maxDepth) {
      return '[MAX_DEPTH_REACHED]';
    }

    if (seen.has(obj)) {
      return '[CIRCULAR_REFERENCE]';
    }

    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.sanitize(item, maxDepth, currentDepth + 1, seen),
      );
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.sanitize(value, maxDepth, currentDepth + 1, seen);
      }
    }

    return sanitized;
  }
}
