import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { getClientIp } from '../utils/client-ip.util';
import { AuditService } from '../../audit/audit.service';
import {
  RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const limit = options?.limit ?? 5;
    const windowSec = options?.windowSec ?? 60;
    const actionType = options?.actionType ?? 'GENERIC_RATE_LIMIT';

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user;
    const userId = user?.userId ?? null;

    const deviceId = req.headers['x-device-id'] as string | undefined;
    const ip = getClientIp(req);
    const identifier = (userId || deviceId?.trim() || ip).toLowerCase();

    const key = `rl:${actionType.toLowerCase()}:${identifier}`;
    const count = await this.redis.incr(key, windowSec);

    if (count > limit) {
      this.auditService
        .recordRateLimit({
          userId,
          ipAddress: ip,
          actionType,
        })
        .catch((err) => {
          this.logger.error(
            `Failed to log RateLimitLog for ${actionType}: ${err.message}`,
          );
        });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'common.rate_limit_exceeded',
          retryAfter: windowSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
