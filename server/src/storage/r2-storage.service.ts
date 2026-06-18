import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly expiresIn: number;
  private readonly logger = new Logger(R2StorageService.name);

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.getOrThrow<string>('R2_ENDPOINT');
    const accessKeyId = this.configService.getOrThrow<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>('R2_SECRET_ACCESS_KEY');

    if (!accessKeyId) {
      throw new Error('R2_ACCESS_KEY_ID is missing or empty in environment variables');
    }
    if (!secretAccessKey) {
      throw new Error('R2_SECRET_ACCESS_KEY is missing or empty in environment variables');
    }

    console.log('R2 accessKeyId exists:', Boolean(accessKeyId));
    console.log('R2 accessKeyId prefix:', accessKeyId.slice(0, 6));
    console.log('R2 secretAccessKey exists:', Boolean(secretAccessKey));

    this.bucket = this.configService.getOrThrow<string>('R2_BUCKET_NAME');
    this.expiresIn = this.configService.get<number>('R2_SIGNED_URL_EXPIRES', 300);

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED' as any,
      responseChecksumValidation: 'WHEN_REQUIRED' as any,
      forcePathStyle: true,
    });
  }

  /**
   * Create a presigned GET URL for downloading an object from R2.
   * Sets Content-Disposition to force download with the given filename.
   */
  async createDownloadUrl(key: string, fileName?: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(fileName && {
        ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
      }),
    });

    return getSignedUrl(this.s3, command, { expiresIn: this.expiresIn });
  }

  /**
   * Create a presigned PUT URL for uploading an object to R2.
   * The client MUST use the exact same Content-Type when uploading.
   */
  async createUploadUrl(params: {
    key: string;
    contentType: string;
  }): Promise<string> {
    const contentType = params.contentType || 'application/octet-stream';
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: this.expiresIn,
      signableHeaders: new Set(['host', 'content-type']),
    });

    console.log("R2 signed upload key:", params.key);
    console.log("R2 signed upload contentType:", contentType);
    console.log("R2 upload url signed headers:", uploadUrl.match(/X-Amz-SignedHeaders=([^&]+)/)?.[1]);

    return uploadUrl;
  }

  /**
   * Check whether an object exists in the bucket.
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (error: any) {
      if (error?.name === 'NotFound' || error?.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Retrieve metadata (size and content type) of an object in the bucket.
   */
  async getObjectMetadata(
    key: string,
  ): Promise<{ contentLength: number; contentType: string }> {
    const response = await this.s3.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      contentLength: response.ContentLength ?? 0,
      contentType: response.ContentType ?? 'application/octet-stream',
    };
  }

  /**
   * Delete an object from the bucket.
   */
  async deleteObject(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
