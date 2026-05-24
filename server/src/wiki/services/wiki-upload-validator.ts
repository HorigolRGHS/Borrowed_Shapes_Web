import { BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { ALLOWED_UPLOAD_MIMES } from '../dto/wiki-constants';

export interface UploadValidationResult {
  mimeType: string;
  sanitizedName: string;
}

export async function validateUploadOrThrow(
  buffer: Buffer,
  declaredMime: string,
  originalName: string,
): Promise<UploadValidationResult> {
  if (!ALLOWED_UPLOAD_MIMES.includes(declaredMime as any)) {
    throw new BadRequestException('wiki.upload_invalid_type');
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_UPLOAD_MIMES.includes(detected.mime as any)) {
    throw new BadRequestException('wiki.upload_invalid_type');
  }
  if (detected.mime !== declaredMime) {
    throw new BadRequestException('wiki.upload_invalid_type');
  }

  // Sanitize: strip path separators and disallowed chars; cap length.
  const base = originalName.split(/[\\/]/).pop() ?? 'upload';
  const sanitized = base
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 100) || 'upload';

  return { mimeType: detected.mime, sanitizedName: sanitized };
}
