import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { ConfigService } from '@nestjs/config';
import { LocalDiskStorageService } from './local-disk-storage.service';

describe('LocalDiskStorageService', () => {
  let svc: LocalDiskStorageService;
  let tmpDir: string;
  let baseUrl: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wiki-storage-'));
    baseUrl = 'http://test.local:3001';
    const config = {
      get: (key: string) => {
        if (key === 'WIKI_UPLOAD_BASE_URL') return baseUrl;
        if (key === 'WIKI_UPLOAD_DIR') return tmpDir;
        return undefined;
      },
    } as unknown as ConfigService;
    svc = new LocalDiskStorageService(config);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('writes file with .jpg extension for image/jpeg', async () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff]);
    const out = await svc.upload({
      buffer: buf,
      mimeType: 'image/jpeg',
      originalName: 'photo.jpg',
    });
    expect(out.url).toMatch(new RegExp(`^${baseUrl}/uploads/wiki/[a-f0-9-]+\\.jpg$`));
    expect(out.size).toBe(3);
    const written = await fs.readFile(path.join(tmpDir, 'wiki', out.key));
    expect(written.equals(buf)).toBe(true);
  });

  it('uses .png extension for image/png', async () => {
    const out = await svc.upload({
      buffer: Buffer.from([0]),
      mimeType: 'image/png',
      originalName: 'icon.png',
    });
    expect(out.key.endsWith('.png')).toBe(true);
  });

  it('throws on unknown mime type', async () => {
    await expect(
      svc.upload({
        buffer: Buffer.from([0]),
        mimeType: 'application/octet-stream',
        originalName: 'x',
      }),
    ).rejects.toThrow();
  });

  it('delete removes the file and ignores ENOENT', async () => {
    const out = await svc.upload({
      buffer: Buffer.from([0]),
      mimeType: 'image/png',
      originalName: 'x.png',
    });
    await svc.delete(out.key);
    await svc.delete(out.key); // second call should not throw
    await expect(fs.access(path.join(tmpDir, 'wiki', out.key))).rejects.toThrow();
  });
});
