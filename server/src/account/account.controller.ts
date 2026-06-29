import { Controller, Patch, Post, Get, Delete, Body, Req, Param, Query, HttpCode, HttpStatus, Res, StreamableFile } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags, ApiBody, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AvatarUploadRequestDto, AvatarUploadResponseDto } from './dto/avatar-upload.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { ApiResponseDto, okResponse } from '../common/dto/api-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminAccountQueryDto } from './dto/admin-account-query.dto';
import { AdminUpdateAccountProfileDto } from './dto/admin-update-account-profile.dto';
import { AdminBanAccountDto } from './dto/admin-ban-account.dto';
import { AdminAuditLogQueryDto } from './dto/admin-audit-log-query.dto';
import { AdminSystemAuditLogQueryDto } from './dto/admin-system-audit-log-query.dto';
import { AdminUpdateAccountRoleDto } from './dto/admin-update-account-role.dto';
import { AdminDashboardStatisticsQueryDto } from './dto/admin-dashboard-statistics-query.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.updateProfile(user.userId, dto, req.ip ?? '');
    return okResponse('account.profile_updated', data, `${req.method} ${req.path}`);
  }

  @Post('avatar-upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: AvatarUploadRequestDto })
  async getAvatarUploadUrl(
    @Body() dto: AvatarUploadRequestDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<AvatarUploadResponseDto>> {
    const data = await this.accountService.getAvatarUploadUrl(user.userId, dto);
    return okResponse('account.avatar_upload_url_created', data, `${req.method} ${req.path}`);
  }

  
  @Public()
  @Get('avatar/:id')
  @ApiOperation({ summary: 'Get user avatar image' })
  async getAvatar(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, contentType, contentLength } = await this.accountService.getAvatarStream(id);
    
    req.on('close', () => {
      if (!res.writableEnded) {
        stream.destroy();
      }
    });

    stream.on('error', (err: any) => {
      console.warn(`[AccountController] Stream error for avatar ${id}:`, err?.message || err);
    });

    res.set({
      'Content-Type': contentType,
      'Content-Length': contentLength,
      'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
    });
    
    return new StreamableFile(stream);
  }


  // ─── ADMIN ENDPOINTS ────────────────────────────────────────────────────────

  @Roles('ADMIN')
  @Get('admin/users')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all users (Admin)' })
  async getAdminUsers(
    @Query() query: AdminAccountQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.getAdminUsers(query);
    return okResponse('admin.account.users_listed', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Get('admin/users/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user details (Admin)' })
  async getAdminUserDetails(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.getAdminUserDetails(id);
    return okResponse('admin.account.user_details', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Get('admin/audit-logs')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get system audit logs (Admin)' })
  async getSystemAuditLogs(
    @Query() query: AdminSystemAuditLogQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.getSystemAuditLogs(query);
    return okResponse('admin.auditLogs.system_audit_logs', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Get('admin/users/:id/audit-logs')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user audit logs (Admin)' })
  async getAdminUserAuditLogs(
    @Param('id') id: string,
    @Query() query: AdminAuditLogQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.getAdminUserAuditLogs(id, query);
    return okResponse('admin.account.user_audit_logs', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Get('admin/dashboard/statistics')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get dashboard statistics (Admin)' })
  async getDashboardStatistics(
    @Query() query: AdminDashboardStatisticsQueryDto,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.getDashboardStatistics(query);
    return okResponse('admin.dashboard.statistics_loaded', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Patch('admin/users/:id/profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update user profile (Admin)' })
  async adminUpdateProfile(
    @Param('id') targetId: string,
    @Body() dto: AdminUpdateAccountProfileDto,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.adminUpdateProfile(admin.userId, targetId, dto, req.ip ?? '');
    return okResponse('admin.account.profile_updated', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Patch('admin/users/:id/role')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update user role (Admin)' })
  async adminUpdateRole(
    @Param('id') targetId: string,
    @Body() dto: AdminUpdateAccountRoleDto,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.adminUpdateRole(admin.userId, targetId, dto, req.ip ?? '');
    return okResponse('admin.account.role_updated', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Patch('admin/users/:id/ban')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ban user (Admin)' })
  async adminBanUser(
    @Param('id') targetId: string,
    @Body() dto: AdminBanAccountDto,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.adminBanUser(admin.userId, targetId, dto, req.ip ?? '');
    return okResponse('admin.account.user_banned', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Patch('admin/users/:id/unban')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Unban user (Admin)' })
  async adminUnbanUser(
    @Param('id') targetId: string,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.adminUnbanUser(admin.userId, targetId, req.ip ?? '');
    return okResponse('admin.account.user_unbanned', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Delete('admin/users/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete user (Admin)' })
  async adminDeleteUser(
    @Param('id') targetId: string,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.adminDeleteUser(admin.userId, targetId, req.ip ?? '');
    return okResponse('admin.account.user_deleted', data, `${req.method} ${req.path}`);
  }

  @Roles('ADMIN')
  @Patch('admin/users/:id/restore')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Restore soft-deleted user (Admin)' })
  async adminRestoreUser(
    @Param('id') targetId: string,
    @CurrentUser() admin: RequestUser,
    @Req() req: Request,
  ): Promise<ApiResponseDto<any>> {
    const data = await this.accountService.adminRestoreUser(admin.userId, targetId, req.ip ?? '');
    return okResponse('admin.account.messages.restore_success', data, `${req.method} ${req.path}`);
  }
}
