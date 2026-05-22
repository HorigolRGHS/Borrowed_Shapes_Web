import { validateUploadOrThrow } from './wiki-upload-validator';

// Real magic bytes for each format. PNG detection in `file-type` requires
// the 8-byte signature plus the IHDR chunk-id, hence 16 bytes.
const PNG_HEAD = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);
const JPEG_HEAD = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const GIF_HEAD = Buffer.from('GIF89a');
const SVG_BUF = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const TEXT_BUF = Buffer.from('plain text');

describe('validateUploadOrThrow', () => {
  it('accepts PNG with matching mime', async () => {
    await expect(
      validateUploadOrThrow(PNG_HEAD, 'image/png', 'a.png'),
    ).resolves.toBeDefined();
  });

  it('accepts JPEG with matching mime', async () => {
    await expect(
      validateUploadOrThrow(JPEG_HEAD, 'image/jpeg', 'a.jpg'),
    ).resolves.toBeDefined();
  });

  it('rejects mime/content mismatch (declared png, actually jpeg)', async () => {
    await expect(
      validateUploadOrThrow(JPEG_HEAD, 'image/png', 'fake.png'),
    ).rejects.toThrow('wiki.upload_invalid_type');
  });

  it('rejects SVG outright', async () => {
    await expect(
      validateUploadOrThrow(SVG_BUF, 'image/svg+xml', 'evil.svg'),
    ).rejects.toThrow('wiki.upload_invalid_type');
  });

  it('rejects plain text masquerading as png', async () => {
    await expect(
      validateUploadOrThrow(TEXT_BUF, 'image/png', 'tricky.png'),
    ).rejects.toThrow('wiki.upload_invalid_type');
  });

  it('returns sanitized filename and detected mime', async () => {
    const out = await validateUploadOrThrow(GIF_HEAD, 'image/gif', '../../etc/passwd.gif');
    expect(out.sanitizedName).not.toContain('/');
    expect(out.sanitizedName).not.toContain('..');
    expect(out.mimeType).toBe('image/gif');
  });
});
