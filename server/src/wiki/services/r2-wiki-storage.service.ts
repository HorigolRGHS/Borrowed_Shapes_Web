import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { R2StorageService } from '../../storage/r2-storage.service';
import {
  WikiStorageService,
  WikiStorageUploadInput,
  WikiStorageUploadResult,
} from './wiki-storage.service';
import { MIME_EXT_MAP } from '../dto/wiki-constants';

@Injectable()
export class R2WikiStorageService implements WikiStorageService {
  constructor(private readonly r2: R2StorageService) {}

  async upload(
    input: WikiStorageUploadInput,
  ): Promise<WikiStorageUploadResult> {
    const ext = (MIME_EXT_MAP as Record<string, string>)[input.mimeType];
    if (!ext) throw new Error(`Unsupported mime type: ${input.mimeType}`);

    const key = `wiki/${input.wikiId}/${randomUUID()}${ext}`;
    await this.r2.putObject(key, input.buffer, input.mimeType);

    return {
      url: `/api/wiki/image/${key}`,
      key,
      size: input.buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    await this.r2.deleteObject(key);
  }
}
