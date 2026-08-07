import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type RequestUser,
} from '../auth/decorators/current-user.decorator';
import { DownloadsService } from './downloads.service';
import { GameVersionQueryDto } from './dto/game-version-query.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { DownloadHistoryQueryDto } from './dto/download-history-query.dto';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { getClientIp } from '../common/utils/client-ip.util';

@ApiTags('Downloads')
@Controller('downloads')
export class DownloadsController {
  constructor(
    private readonly downloadsService: DownloadsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /downloads/versions
   * Public — Guest, User, Admin can view available game versions.
   */
  @Public()
  @Get('versions')
  @ApiOperation({ summary: 'List available game versions for download' })
  async listVersions(
    @Query() query: GameVersionQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.downloadsService.listVersions(query);
    return okResponse(
      'downloads.list_versions_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  /**
   * GET /downloads/active-version
   * Public — Get the currently active game version.
   */
  @Public()
  @Get('active-version')
  @ApiOperation({ summary: 'Get the active game version for public download' })
  async getActiveVersion(@Req() req: Request): Promise<ApiResponseDto<any>> {
    const data = await this.downloadsService.getActiveVersion();
    // Return null data if no active version found, so frontend can show empty state.
    return okResponse(
      'downloads.active_version_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  /**
   * POST /downloads/versions/:id/download
   * Public — Guest, User, Admin can download.
   * If a valid Bearer token is present, the userId is extracted and a
   * DownloadLog is recorded. If no token or token is invalid, the download
   * still proceeds (no 401 thrown).
   *
   * Actual transfer tracking requires an external service such as
   * Cloudflare Worker or R2 analytics. Current backend records download
   * request metadata only.
   */
  @Public()
  @Post('versions/:id/download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a presigned download URL for a game version',
    description:
      'Public endpoint. If a valid Bearer token is provided, a download log is recorded. ' +
      'Guest users can download without authentication.',
  })
  async requestDownload(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const userId = this.tryExtractUserId(req);
    const clientIp = getClientIp(req);

    const data = await this.downloadsService.requestDownload(
      id,
      userId,
      clientIp,
    );
    return okResponse(
      'downloads.download_url_created',
      data,
      `${req.method} ${req.path}`,
    );
  }

  /**
   * GET /downloads/history
   * User only — view own download history.
   */
  @Get('history')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'View own download history (authenticated users only)',
    description:
      'Download request history. Records when a download link was created, not completion.',
  })
  async getHistory(
    @CurrentUser() user: RequestUser,
    @Query() query: DownloadHistoryQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.downloadsService.getHistory(user.userId, query);
    return okResponse(
      'downloads.history_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  /**
   * POST /downloads/admin/upload-url
   * Admin only — create a presigned upload URL for R2.
   */
  @Roles('ADMIN')
  @Post('admin/upload-url')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a presigned upload URL (Admin)',
    description:
      'Returns a presigned PUT URL. The client MUST upload using the exact same Content-Type ' +
      'specified in the request. Mismatched Content-Type will result in SignatureDoesNotMatch.',
  })
  async createUploadUrl(
    @Body() dto: CreateUploadUrlDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.downloadsService.createUploadUrl(dto);
    return okResponse(
      'downloads.upload_url_created',
      data,
      `${req.method} ${req.path}`,
    );
  }

  /**
   * POST /downloads/admin/confirm-upload
   * Admin only — confirm a successful upload and create the FileAsset record.
   */
  @Roles('ADMIN')
  @Post('admin/confirm-upload')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Confirm upload and create FileAsset record (Admin)',
    description:
      'Verifies the object exists on R2 and creates the database record.',
  })
  async confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @Req() req: Request & { user: any },
  ): Promise<ApiResponseDto<any>> {
    const adminId = req.user?.userId;
    const data = await this.downloadsService.confirmUpload(adminId, dto);
    return okResponse(
      'downloads.upload_confirmed',
      data,
      `${req.method} ${req.path}`,
    );
  }

  /**
   * PATCH /downloads/admin/versions/:id/active
   * Admin only — Set a specific version as the active version.
   */
  @Roles('ADMIN')
  @Patch('admin/versions/:id/active')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Set active download version (Admin)',
    description:
      'Sets the specified version as active and deactivates all others.',
  })
  async setActiveVersion(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.downloadsService.setActiveVersion(id, user);
    return okResponse(
      'downloads.set_active_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  /**
   * DELETE /downloads/admin/versions/:id
   * Admin only — Delete a game version
   */
  @Roles('ADMIN')
  @Delete('admin/versions/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a game version (Admin)',
    description: 'Deletes the file asset from storage and the database.',
  })
  async deleteVersion(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.downloadsService.deleteVersion(id, user.userId);
    return okResponse(
      'downloads.delete_success',
      data,
      `${req.method} ${req.path}`,
    );
  }

  // ─── Helper: Optional JWT extraction ─────────────────────
  /**
   * Attempts to extract a userId from the Authorization header.
   * Returns null if the header is missing or the token is invalid.
   * This is intentional: the download endpoint must never block guests.
   */
  private tryExtractUserId(req: Request): string | null {
    const auth = req.headers?.authorization ?? '';
    if (!auth.startsWith('Bearer ')) return null;

    const token = auth.slice(7).trim();
    if (!token) return null;

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'change-me-in-production',
        ),
      });
      return (payload.sub as string) ?? null;
    } catch {
      return null;
    }
  }
}
