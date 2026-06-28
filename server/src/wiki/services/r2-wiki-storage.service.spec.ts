import { R2WikiStorageService } from './r2-wiki-storage.service';
import { R2StorageService } from '../../storage/r2-storage.service';

function makeR2() {
  return {
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  } as unknown as R2StorageService;
}

describe('R2WikiStorageService', () => {
  it('uploads with key wiki/<wikiId>/<uuid>.png and returns proxy url + size', async () => {
    const r2 = makeR2();
    const svc = new R2WikiStorageService(r2);
    const buf = Buffer.from([0xff, 0xd8, 0xff]);

    const out = await svc.upload({
      wikiId: 'page-123',
      buffer: buf,
      mimeType: 'image/png',
      originalName: 'icon.png',
    });

    expect(out.key).toMatch(/^wiki\/page-123\/[a-f0-9-]+\.png$/);
    expect(out.url).toBe(`/api/wiki/image/${out.key}`);
    expect(out.size).toBe(3);
    expect(r2.putObject).toHaveBeenCalledWith(out.key, buf, 'image/png');
  });

  it('uses .jpg extension for image/jpeg', async () => {
    const svc = new R2WikiStorageService(makeR2());
    const out = await svc.upload({
      wikiId: 'page-123',
      buffer: Buffer.from([0]),
      mimeType: 'image/jpeg',
      originalName: 'p.jpg',
    });
    expect(out.key.endsWith('.jpg')).toBe(true);
  });

  it('throws on unsupported mime type', async () => {
    const svc = new R2WikiStorageService(makeR2());
    await expect(
      svc.upload({
        wikiId: 'page-123',
        buffer: Buffer.from([0]),
        mimeType: 'image/heic',
        originalName: 'x.heic',
      }),
    ).rejects.toThrow('Unsupported mime type');
  });

  it('delete forwards the key to r2.deleteObject', async () => {
    const r2 = makeR2();
    const svc = new R2WikiStorageService(r2);
    await svc.delete('wiki/page-123/abc.png');
    expect(r2.deleteObject).toHaveBeenCalledWith('wiki/page-123/abc.png');
  });
});
