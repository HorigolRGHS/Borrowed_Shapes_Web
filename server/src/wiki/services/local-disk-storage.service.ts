import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  WikiStorageService,
  WikiStorageUploadInput,
  WikiStorageUploadResult,
} from './wiki-storage.service';
import { MIME_EXT_MAP } from '../dto/wiki-constants';

@Injectable()
export class LocalDiskStorageService implements WikiStorageService {
  constructor(private config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('WIKI_UPLOAD_BASE_URL') ?? 'http://localhost:3001';
  }

  private get rootDir(): string {
    const configured = this.config.get<string>('WIKI_UPLOAD_DIR');
    if (configured && path.isAbsolute(configured)) return configured;
    return path.join(process.cwd(), configured ?? 'uploads');
  }

  private get wikiDir(): string {
    return path.join(this.rootDir, 'wiki');
  }

  async upload(input: WikiStorageUploadInput): Promise<WikiStorageUploadResult> {
    const ext = (MIME_EXT_MAP as Record<string, string>)[input.mimeType];
    if (!ext) throw new Error(`Unsupported mime type: ${input.mimeType}`);

    const key = `${randomUUID()}${ext}`;
    await fs.mkdir(this.wikiDir, { recursive: true });
    const filePath = path.join(this.wikiDir, key);
    await fs.writeFile(filePath, input.buffer);

    return {
      url: `${this.baseUrl}/uploads/wiki/${key}`,
      key,
      size: input.buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.wikiDir, key);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }
}
