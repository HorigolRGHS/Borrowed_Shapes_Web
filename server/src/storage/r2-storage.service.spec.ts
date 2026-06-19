import { ConfigService } from '@nestjs/config';
import { R2StorageService } from './r2-storage.service';
import { PutObjectCommand } from '@aws-sdk/client-s3';

function makeConfig(): ConfigService {
  const values: Record<string, string | number> = {
    R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    R2_ACCESS_KEY_ID: 'ak',
    R2_SECRET_ACCESS_KEY: 'sk',
    R2_BUCKET_NAME: 'bws',
    R2_SIGNED_URL_EXPIRES: 300,
  };
  return {
    get: (k: string, d?: unknown) => values[k] ?? d,
    getOrThrow: (k: string) => {
      if (values[k] === undefined) throw new Error(`missing ${k}`);
      return values[k];
    },
  } as unknown as ConfigService;
}

describe('R2StorageService.putObject', () => {
  it('sends a PutObjectCommand with bucket, key, body and content type', async () => {
    const svc = new R2StorageService(makeConfig());
    const send = jest
      .spyOn((svc as any).s3, 'send')
      .mockResolvedValue({} as never);
    const buf = Buffer.from([1, 2, 3]);

    await svc.putObject('wiki/abc.png', buf, 'image/png');

    expect(send).toHaveBeenCalledTimes(1);
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input).toMatchObject({
      Bucket: 'bws',
      Key: 'wiki/abc.png',
      Body: buf,
      ContentType: 'image/png',
    });
  });
});
