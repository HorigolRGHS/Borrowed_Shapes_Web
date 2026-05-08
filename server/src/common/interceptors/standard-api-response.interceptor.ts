import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { I18nService } from '../i18n/i18n.service';
import { ApiResponseDto } from '../dto/api-response.dto';
import { safeStringify } from '../utils/json.util';

interface StandardShape<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  path: string;
  timestamp: string;
}

function isStandardShape(value: unknown): value is StandardShape<unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.statusCode === 'number' &&
    typeof candidate.success === 'boolean' &&
    typeof candidate.message === 'string' &&
    'data' in candidate &&
    typeof candidate.path === 'string' &&
    typeof candidate.timestamp === 'string'
  );
}

@Injectable()
export class StandardApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  private readonly logger = new Logger(StandardApiResponseInterceptor.name);

  constructor(private readonly i18n: I18nService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseDto<T>> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<any>();
    const response = httpCtx.getResponse<{ statusCode: number }>();
    const startedAt = Date.now();
    const lang = request.headers['accept-language'] as string;

    return next.handle().pipe(
      map((data) => {
        if (isStandardShape(data)) {
          data.message = this.i18n.t(data.message, lang);
          return data as ApiResponseDto<T>;
        }

        const statusCode = response.statusCode || 200;
        const success = statusCode >= 200 && statusCode < 400;
        const path = request.originalUrl ?? request.url ?? '';

        return new ApiResponseDto<T>(
          statusCode,
          success,
          this.i18n.t(success ? 'COMMON.REQUEST_SUCCESSFUL' : 'COMMON.REQUEST_FAILED', lang),
          (data ?? null) as T,
          path,
          new Date().toISOString(),
        );
      }),
      tap((result) => {
        const method = request.method;
        const path = request.originalUrl ?? request.url ?? '';
        const durationMs = Date.now() - startedAt;
        this.logger.log(
          [
            `${method} ${path} duration=${durationMs}ms`,
            `request:\n${safeStringify(request.body, true)}`,
            `response:\n${safeStringify(result, true)}`,
          ].join('\n'),
        );
      }),
    );
  }
}
