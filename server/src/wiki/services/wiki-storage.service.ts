import type { Readable } from 'node:stream';

export const WIKI_STORAGE = Symbol('WIKI_STORAGE');

export interface WikiStorageUploadInput {
  wikiId: string;
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

export interface WikiStorageUploadResult {
  url: string;
  key: string;
  size: number;
}

export interface WikiStorageStreamResult {
  stream: Readable;
  contentType: string;
  contentLength: number;
}

export interface WikiStorageService {
  upload(input: WikiStorageUploadInput): Promise<WikiStorageUploadResult>;
  delete(key: string): Promise<void>;
  // Throws NotFoundException when the key does not exist.
  getStream(key: string): Promise<WikiStorageStreamResult>;
}
