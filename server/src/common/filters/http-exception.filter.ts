import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';
import { safeStringify } from '../utils/json.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  private isInvalidJsonPayload(message: string | string[]): boolean {
    const text = Array.isArray(message) ? message.join(' ') : message;
    return /JSON|Unexpected token|Expected ',' or '}'/i.test(text);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let rawMessage: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        rawMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        rawMessage = resObj.message ?? rawMessage;
      }

      // Body parser throws BadRequestException for malformed JSON before DTO validation runs.
      if (statusCode === HttpStatus.BAD_REQUEST && this.isInvalidJsonPayload(rawMessage)) {
        rawMessage = 'Invalid JSON payload';
      }
    } else {
      // Unexpected error — log full stack, never expose internals to client
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // const message = Array.isArray(rawMessage) ? rawMessage.join('; ') : rawMessage;
    const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
    const payload = new ApiResponseDto<null>(
      statusCode,
      false,
      message,
      null,
      request.url,
      new Date().toISOString(),
    );

    response.status(statusCode).json(payload);

    this.logger.warn(
      [
        `${request.method} ${request.url}`,
        `request:\n${safeStringify(request.body, true)}`,
        `response:\n${safeStringify(payload, true)}`,
      ].join('\n'),
    );
  }
}
