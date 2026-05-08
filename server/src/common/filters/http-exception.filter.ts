import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { I18nService } from '../i18n/i18n.service';
import { ApiResponseDto } from '../dto/api-response.dto';
import { safeStringify } from '../utils/json.util';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly i18n: I18nService) {}

  private isInvalidJsonPayload(message: string | string[]): boolean {
    const text = Array.isArray(message) ? message.join(' ') : message;
    return /JSON|Unexpected token|Expected ',' or '}'/i.test(text);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let rawMessage: string | string[] = 'COMMON.INTERNAL_SERVER_ERROR';
    const lang = request.headers['accept-language'] as string;

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
        rawMessage = 'COMMON.INVALID_JSON_PAYLOAD';
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

    // Translate message
    let message: string;
    if (Array.isArray(rawMessage)) {
      message = this.i18n.t(rawMessage[0], lang);
    } else {
      message = this.i18n.t(rawMessage, lang);
    }

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
