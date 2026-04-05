import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

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

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message ?? message;
        // Preserve validation errors array structure
        if (Array.isArray(resObj.message)) {
          error = resObj.message;
        }
      }

      // Body parser throws BadRequestException for malformed JSON before DTO validation runs.
      if (status === HttpStatus.BAD_REQUEST && this.isInvalidJsonPayload(message)) {
        message = 'Invalid JSON payload';
        error = undefined;
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

    response.status(status).json({
      statusCode: status,
      success: false,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(error && { error }),
    });
  }
}
