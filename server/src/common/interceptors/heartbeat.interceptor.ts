import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PresenceService } from '../../presence/presence.service';

@Injectable()
export class HeartbeatInterceptor implements NestInterceptor {
  constructor(private readonly presenceService: PresenceService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<any>();
    const user = request?.user;

    if (user?.userId && user?.platform) {
      try {
        await this.presenceService.touchOnline(user.userId, user.platform, user.sessionId);
      } catch {
        // Best-effort heartbeat; do not block request.
      }
    }

    return next.handle();
  }
}
