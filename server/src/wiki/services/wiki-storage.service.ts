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

export interface WikiStorageService {
  upload(input: WikiStorageUploadInput): Promise<WikiStorageUploadResult>;
  delete(key: string): Promise<void>;
}
