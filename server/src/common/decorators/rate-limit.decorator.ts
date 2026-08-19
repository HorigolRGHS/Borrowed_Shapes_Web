import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  limit: number;
  windowSec: number;
  actionType: string;
}

export const RateLimit = (
  actionType: string,
  limit = 5,
  windowSec = 60,
) => SetMetadata(RATE_LIMIT_KEY, { actionType, limit, windowSec });
