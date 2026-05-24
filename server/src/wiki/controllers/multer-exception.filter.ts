import {
  Catch,
  ArgumentsHost,
  ExceptionFilter,
  PayloadTooLargeException,
  BadRequestException,
} from '@nestjs/common';
import { MulterError } from 'multer';

@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, _host: ArgumentsHost) {
    if (exception.code === 'LIMIT_FILE_SIZE') {
      throw new PayloadTooLargeException('wiki.upload_too_large');
    }
    if (exception.code === 'LIMIT_UNEXPECTED_FILE') {
      throw new BadRequestException('wiki.upload_invalid_type');
    }
    throw new BadRequestException('wiki.upload_failed');
  }
}
