import { Controller, Get, Put, Param, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
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
  constructor(
    private em: EntityManager,
    private presenceService: PresenceService,
  ) {}

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update my online presence (heartbeat)' })
  @ApiResponse({ status: 200, description: 'Heartbeat recorded' })
  async heartbeat(@CurrentUser() user: RequestUser): Promise<null> {
    await this.presenceService.touchOnline(user.userId, user.platform, user.sessionId);
    return null;
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all online users (Admin only)' })
  @ApiResponse({ status: 200, type: [PresenceResponseDto] })
  async listAllPresence(): Promise<PresenceResponseDto[]> {
    const users = await this.em.find(
      User,
      { deletedAt: null },
      { fields: ['id', 'email', 'displayName', 'role'] },
    );

    const userIds = users.map((u) => u.id);
    const statuses = userIds.length
      ? await this.em.find(UserOnlineStatus, { userId: { $in: userIds } })
      : [];
    const statusMap = new Map(
      statuses.map((s) => [s.userId.id, s]),
    );

    return users.map((u) => {
      const status = statusMap.get(u.id);
      return {
        userId: u.id,
        email: String(u.email),
        displayName: u.displayName ? String(u.displayName) : null,
        role: u.role,
        isOnline: status?.isOnline ?? false,
        lastOnline: status?.lastOnline ?? null,
        onlinePlatforms: status?.onlinePlatforms ?? [],
      };
    });
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

    const record = await this.em.findOne(UserOnlineStatus, {
      userId: this.em.getReference(User, userId),
    });

    if (!record) {
      return {
        userId,
        isOnline: false,
        lastOnline: null,
        onlinePlatforms: [],
      };
    }

    return {
      userId,
      isOnline: record.isOnline,
      lastOnline: record.lastOnline ?? null,
      onlinePlatforms: record.onlinePlatforms ?? [],
    };
  }
}
