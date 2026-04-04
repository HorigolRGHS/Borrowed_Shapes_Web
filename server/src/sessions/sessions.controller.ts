import { Controller, Get, Put, Delete, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { SessionsService } from './sessions.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';

@Controller('sessions')
export class SessionsController {
  constructor(private sessionsService: SessionsService) {}

  @Get('me')
  getMe(@CurrentUser() user: RequestUser) {
    return this.sessionsService.getMe(user.userId, user.platform);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@CurrentUser() user: RequestUser): Promise<null> {
    await this.sessionsService.heartbeat(user.userId, user.platform);
    return null;
  }

  @Get()
  listSessions(@CurrentUser() user: RequestUser) {
    return this.sessionsService.listSessions(user.userId, user.platform);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ): Promise<null> {
    await this.sessionsService.revoke(id, user.userId, user.role, req.ip ?? '');
    return null;
  }
}
