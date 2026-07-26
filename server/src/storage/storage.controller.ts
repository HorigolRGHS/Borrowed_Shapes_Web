import { Controller, Get, Param, Res, StreamableFile, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { R2StorageService } from './r2-storage.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: R2StorageService) {}

  @Public()
  @Get('media/*key')
  @ApiOperation({ summary: 'Public: stream any media through backend proxy' })
  async streamMedia(
    @Param('key') keyParam: string | string[],
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const key = Array.isArray(keyParam) ? keyParam.join('/') : keyParam;
    const { stream, contentType, contentLength } =
      await this.storageService.getObjectStream(key);

    // Handle abrupt disconnections to prevent memory leaks
    req.on('close', () => {
      if (!res.writableEnded) {
        stream.destroy();
      }
    });

    stream.on('error', (err: any) => {
      console.warn(
        `[StorageController] Stream error for media ${key}:`,
        err?.message || err,
      );
      if (!res.headersSent) {
        res.status(500).send('Error streaming media');
      }
    });

    res.set({
      'Content-Type': contentType,
      'Content-Length': contentLength,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    
    return new StreamableFile(stream);
  }
}
