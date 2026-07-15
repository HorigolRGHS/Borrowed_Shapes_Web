import {
  Controller,
  Get,
  Put,
  Param,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PresenceService } from './presence.service';
import { UserOnlineStatus } from '../entities/UserOnlineStatus';
import { User } from '../entities/User';
import { PresenceResponseDto } from './dto/presence.dto';

@ApiTags('Presence')
@Controller('presence')
export class PresenceController {
  constructor(private presenceService: PresenceService) {}

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update my online presence (heartbeat)' })
  @ApiResponse({ status: 200, description: 'Heartbeat recorded' })
  async heartbeat(@CurrentUser() user: RequestUser): Promise<null> {
    await this.presenceService.touchOnline(
      user.userId,
      user.platform,
      user.sessionId,
    );
    return null;
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all online users (Admin only)' })
  @ApiResponse({ status: 200, type: [PresenceResponseDto] })
  async listAllPresence(): Promise<PresenceResponseDto[]> {
    return this.presenceService.listAllPresence();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get presence status of a specific user' })
  @ApiResponse({ status: 200, type: PresenceResponseDto })
  async getUserPresence(
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<PresenceResponseDto> {
    if (user.userId !== userId && user.role !== 'ADMIN') {
      throw new ForbiddenException('common.forbidden');
    }
    return this.presenceService.getUserPresence(userId);
  }
}
