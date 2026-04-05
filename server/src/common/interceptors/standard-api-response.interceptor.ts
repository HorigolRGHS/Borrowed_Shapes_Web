import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

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
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseDto<T>> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<Request & { originalUrl?: string; url?: string }>();
    const response = httpCtx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data) => {
        if (isStandardShape(data)) {
          return data as ApiResponseDto<T>;
        }

        const statusCode = response.statusCode || 200;
        const success = statusCode >= 200 && statusCode < 400;
        const path = request.originalUrl ?? request.url ?? '';

        return new ApiResponseDto<T>(
          statusCode,
          success,
          success ? 'Request successful' : 'Request failed',
          (data ?? null) as T,
          path,
          new Date().toISOString(),
        );
      }),
    );
  }
}
