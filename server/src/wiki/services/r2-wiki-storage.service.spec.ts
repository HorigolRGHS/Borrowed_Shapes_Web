import { ConfigService } from '@nestjs/config';
import { R2WikiStorageService } from './r2-wiki-storage.service';
import { R2StorageService } from '../../storage/r2-storage.service';

function makeR2() {
  return {
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  } as unknown as R2StorageService;
}

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (k: string) => values[k],
    getOrThrow: (k: string) => {
      if (values[k] === undefined) throw new Error(`missing ${k}`);
      return values[k];
    },
  } as unknown as ConfigService;
}

describe('R2WikiStorageService', () => {
  const base = 'https://pub-x.r2.dev';

  it('uploads with key wiki/<uuid>.png and returns public url + size', async () => {
    const r2 = makeR2();
    const svc = new R2WikiStorageService(
      r2,
      makeConfig({ R2_PUBLIC_DEV_URL: base }),
    );
    const buf = Buffer.from([0xff, 0xd8, 0xff]);

    const out = await svc.upload({
      buffer: buf,
      mimeType: 'image/png',
      originalName: 'icon.png',
    });

    expect(out.key).toMatch(/^wiki\/[a-f0-9-]+\.png$/);
    expect(out.url).toBe(`${base}/${out.key}`);
    expect(out.size).toBe(3);
    expect(r2.putObject).toHaveBeenCalledWith(out.key, buf, 'image/png');
  });

  it('uses .jpg extension for image/jpeg', async () => {
    const svc = new R2WikiStorageService(
      makeR2(),
      makeConfig({ R2_PUBLIC_DEV_URL: base }),
    );
    const out = await svc.upload({
      buffer: Buffer.from([0]),
      mimeType: 'image/jpeg',
      originalName: 'p.jpg',
    });
    expect(out.key.endsWith('.jpg')).toBe(true);
  });

  it('prefers R2_PUBLIC_BASE_URL and strips a trailing slash', async () => {
    const svc = new R2WikiStorageService(
      makeR2(),
      makeConfig({
        R2_PUBLIC_BASE_URL: 'https://cdn.example.com/',
        R2_PUBLIC_DEV_URL: base,
      }),
    );
    const out = await svc.upload({
      buffer: Buffer.from([0]),
      mimeType: 'image/png',
      originalName: 'x.png',
    });
    expect(out.url).toBe(`https://cdn.example.com/${out.key}`);
  });

  it('throws on unsupported mime type', async () => {
    const svc = new R2WikiStorageService(
      makeR2(),
      makeConfig({ R2_PUBLIC_DEV_URL: base }),
    );
    await expect(
      svc.upload({
        buffer: Buffer.from([0]),
        mimeType: 'image/heic',
        originalName: 'x.heic',
      }),
    ).rejects.toThrow('Unsupported mime type');
  });

  it('delete forwards the key to r2.deleteObject', async () => {
    const r2 = makeR2();
    const svc = new R2WikiStorageService(
      r2,
      makeConfig({ R2_PUBLIC_DEV_URL: base }),
    );
    await svc.delete('wiki/abc.png');
    expect(r2.deleteObject).toHaveBeenCalledWith('wiki/abc.png');
  });

  it('throws at construction when no public base url is configured', () => {
    expect(
      () => new R2WikiStorageService(makeR2(), makeConfig({})),
    ).toThrow();
  });
});
