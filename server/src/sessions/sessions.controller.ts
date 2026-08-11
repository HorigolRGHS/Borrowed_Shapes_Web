import {
  Controller,
  Get,
  Delete,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  UserSessionResponseDto,
  SessionMeResponseDto,
} from './dto/sessions.dto';
import { getClientIp } from '../common/utils/client-ip.util';

@ApiTags('Sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current session details' })
  @ApiResponse({ status: 200, type: SessionMeResponseDto })
  getMe(@CurrentUser() user: RequestUser): Promise<SessionMeResponseDto> {
    return this.sessionsService.getMe(user.userId, user.platform);
  }

  @Get()
  @ApiOperation({ summary: 'List all active sessions for the user' })
  @ApiResponse({ status: 200, type: [UserSessionResponseDto] })
  listSessions(
    @CurrentUser() user: RequestUser,
  ): Promise<UserSessionResponseDto[]> {
    return this.sessionsService.listSessions(user.userId, user.platform);
  }

  @Roles('ADMIN')
  @Get('admin/users/:userId')
  @ApiOperation({ summary: 'List sessions of a specific user (Admin only)' })
  @ApiResponse({ status: 200, type: [UserSessionResponseDto] })
  listSessionsForAdmin(
    @Param('userId') userId: string,
    @CurrentUser() admin: RequestUser,
  ): Promise<UserSessionResponseDto[]> {
    return this.sessionsService.listSessions(userId, admin.platform);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke/Logout a specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<null> {
    await this.sessionsService.revoke(id, user.userId, user.role, getClientIp(req));
    return null;
  }
}
