import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  private readonly publicBaseUrl: string;

  constructor(
    private readonly r2: R2StorageService,
    private readonly config: ConfigService,
  ) {
    const base =
      this.config.get<string>('R2_PUBLIC_BASE_URL') ??
      this.config.getOrThrow<string>('R2_PUBLIC_DEV_URL');
    this.publicBaseUrl = base.replace(/\/+$/, '');
  }

  async upload(
    input: WikiStorageUploadInput,
  ): Promise<WikiStorageUploadResult> {
    const ext = (MIME_EXT_MAP as Record<string, string>)[input.mimeType];
    if (!ext) throw new Error(`Unsupported mime type: ${input.mimeType}`);

    const key = `wiki/${randomUUID()}${ext}`;
    await this.r2.putObject(key, input.buffer, input.mimeType);

    return {
      url: `${this.publicBaseUrl}/${key}`,
      key,
      size: input.buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    await this.r2.deleteObject(key);
  }
}
