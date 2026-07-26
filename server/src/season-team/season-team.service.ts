import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { okResponse } from '../common/dto/api-response.dto';
import { randomUUID } from 'node:crypto';
import { GameProfile } from '../entities/GameProfile';
import { SeasonTeam } from '../entities/SeasonTeam';
import { SeasonTeamMember } from '../entities/SeasonTeamMember';
import { SeasonTeamRepository } from './repositories/season-team.repository';
import { SeasonTeamMemberRepository } from './repositories/season-team-member.repository';
import { GameProfileRepository } from '../game/repositories/game-profile.repository';
import { CreateSeasonTeamDto } from './dto/create-season-team.dto';
import { JoinSeasonTeamDto } from './dto/join-season-team.dto';
import { KickSeasonTeamMemberDto } from './dto/kick-season-team-member.dto';
import { SeasonTeamResponseDto } from './dto/season-team-response.dto';
import { getProxyAvatarUrl } from '../auth/auth-utils';
import { getProxyMediaUrl } from '../storage/media-utils';
import { getEffectiveExpiresAt } from '../achievements/achievements.service';
import { AuditService } from '../audit/audit.service';
import { AuditActionType } from '../entities/AuditActionType';

const TEAM_MAX_MEMBERS = 5; // Leader + tối đa 4 người join

@Injectable()
export class SeasonTeamService {
  constructor(
    private readonly seasonTeamRepository: SeasonTeamRepository,
    private readonly seasonTeamMemberRepository: SeasonTeamMemberRepository,
    private readonly gameProfileRepository: GameProfileRepository,
    private readonly auditService: AuditService,
  ) {}

  async createTeam(userId: string, dto: CreateSeasonTeamDto, path: string) {
    const seasonMonth = this.getCurrentSeasonMonth();
    const profile = await this.findGameProfileOrFail(userId);

    const existingMember = await this.seasonTeamMemberRepository.findOne({
      seasonMonth,
      gameProfileId: profile.id,
    });
    if (existingMember) {
      throw new BadRequestException('season_team.already_in_team');
    }

    const team = this.seasonTeamRepository.create({
      id: randomUUID(),
      seasonMonth,
      name: dto.name?.trim() || undefined,
      leaderId: profile,
    });

    this.seasonTeamMemberRepository.create({
      seasonMonth,
      gameProfileId: profile,
      teamId: team,
    });

    await this.auditService.recordInCurrentUnitOfWork({
      userId: userId,
      actionType: AuditActionType.CREATE,
      entityName: 'SeasonTeam',
      entityId: team.id,
      newValue: {
        name: team.name,
        seasonMonth: team.seasonMonth,
      },
    });

    await this.seasonTeamRepository.flush();

    const payload = await this.buildTeamResponse(team.id, seasonMonth);
    return okResponse<SeasonTeamResponseDto>(
      'season_team.created_success',
      payload,
      path,
    );
  }

  async joinTeam(userId: string, dto: JoinSeasonTeamDto, path: string) {
    const seasonMonth = this.getCurrentSeasonMonth();
    const profile = await this.findGameProfileOrFail(userId);

    const existingMember = await this.seasonTeamMemberRepository.findOne({
      seasonMonth,
      gameProfileId: profile.id,
    });
    if (existingMember) {
      throw new BadRequestException('season_team.already_in_team');
    }

    const code = dto.code.trim().toUpperCase();
    const team = await this.seasonTeamRepository.findOne(
      { seasonMonth, code },
      { populate: ['leaderId'] },
    );
    if (!team) {
      throw new NotFoundException('season_team.not_found');
    }

    const memberCount = await this.seasonTeamMemberRepository.count({
      seasonMonth,
      teamId: team.id,
    });
    if (memberCount >= TEAM_MAX_MEMBERS) {
      throw new BadRequestException('season_team.team_full');
    }

    this.seasonTeamMemberRepository.create({
      seasonMonth,
      gameProfileId: profile,
      teamId: team,
    });

    await this.auditService.recordInCurrentUnitOfWork({
      userId: userId,
      actionType: AuditActionType.UPDATE,
      entityName: 'SeasonTeam',
      entityId: team.id,
      newValue: {
        newMemberId: profile.id,
      },
    });

    await this.seasonTeamRepository.flush();

    const payload = await this.buildTeamResponse(team.id, seasonMonth);
    return okResponse<SeasonTeamResponseDto>(
      'season_team.joined_success',
      payload,
      path,
    );
  }

  async getMyTeam(userId: string, path: string) {
    const seasonMonth = this.getCurrentSeasonMonth();
    const profile = await this.findGameProfileOrFail(userId);

    const myMember = await this.seasonTeamMemberRepository.findOne(
      { seasonMonth, gameProfileId: profile.id },
      { populate: ['teamId'] },
    );

    if (!myMember) {
      return okResponse<SeasonTeamResponseDto | null>(
        'season_team.no_team',
        null,
        path,
      );
    }

    const payload = await this.buildTeamResponse(
      myMember.teamId.id,
      seasonMonth,
    );
    return okResponse<SeasonTeamResponseDto>(
      'season_team.current_team',
      payload,
      path,
    );
  }

  async kickMember(
    userId: string,
    teamId: string,
    dto: KickSeasonTeamMemberDto,
    path: string,
  ) {
    const seasonMonth = this.getCurrentSeasonMonth();
    const leaderProfile = await this.findGameProfileOrFail(userId);
    const team = await this.seasonTeamRepository.findOne(
      { id: teamId, seasonMonth },
      { populate: ['leaderId'] },
    );
    if (!team) {
      throw new NotFoundException('season_team.not_found');
    }
    if (team.leaderId.id !== leaderProfile.id) {
      throw new ForbiddenException('common.forbidden');
    }
    if (dto.gameProfileId === leaderProfile.id) {
      throw new BadRequestException('season_team.cannot_kick_leader');
    }

    const targetMember = await this.seasonTeamMemberRepository.findOne({
      seasonMonth,
      teamId: team.id,
      gameProfileId: dto.gameProfileId,
    });
    if (!targetMember) {
      throw new NotFoundException('season_team.member_not_found');
    }

    await this.auditService.recordInCurrentUnitOfWork({
      userId: userId,
      actionType: AuditActionType.UPDATE,
      entityName: 'SeasonTeam',
      entityId: team.id,
      oldValue: {
        kickedMemberId: dto.gameProfileId,
      },
    });

    await this.seasonTeamMemberRepository.removeAndFlush(targetMember);
    return okResponse<null>('season_team.kicked_success', null, path);
  }

  async leaveTeam(userId: string, path: string) {
    const seasonMonth = this.getCurrentSeasonMonth();
    const profile = await this.findGameProfileOrFail(userId);
    const myMember = await this.seasonTeamMemberRepository.findOne(
      { seasonMonth, gameProfileId: profile.id },
      { populate: ['teamId', 'teamId.leaderId'] },
    );
    if (!myMember) {
      throw new BadRequestException('season_team.not_in_team');
    }
    if (myMember.teamId.leaderId.id === profile.id) {
      throw new BadRequestException('season_team.leader_cannot_leave');
    }

    await this.auditService.recordInCurrentUnitOfWork({
      userId: userId,
      actionType: AuditActionType.UPDATE,
      entityName: 'SeasonTeam',
      entityId: myMember.teamId.id,
      oldValue: {
        leftMemberId: profile.id,
      },
    });

    await this.seasonTeamMemberRepository.removeAndFlush(myMember);
    return okResponse<null>('season_team.left_success', null, path);
  }

  async deleteTeam(userId: string, teamId: string, path: string) {
    const seasonMonth = this.getCurrentSeasonMonth();
    const profile = await this.findGameProfileOrFail(userId);
    const team = await this.seasonTeamRepository.findOne(
      { id: teamId, seasonMonth },
      { populate: ['leaderId'] },
    );
    if (!team) {
      throw new NotFoundException('season_team.not_found');
    }
    if (team.leaderId.id !== profile.id) {
      throw new ForbiddenException('common.forbidden');
    }

    await this.auditService.recordInCurrentUnitOfWork({
      userId: userId,
      actionType: AuditActionType.DELETE,
      entityName: 'SeasonTeam',
      entityId: team.id,
      oldValue: {
        name: team.name,
      },
    });

    await this.seasonTeamRepository.removeAndFlush(team);
    return okResponse<null>('season_team.deleted_success', null, path);
  }

  private async findGameProfileOrFail(userId: string): Promise<GameProfile> {
    const profile = await this.gameProfileRepository.findOne({ userId });
    if (!profile) {
      throw new NotFoundException('game.profile_not_found');
    }
    return profile;
  }

  private getCurrentSeasonMonth(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }

  private async buildTeamResponse(
    teamId: string,
    seasonMonth: string,
  ): Promise<SeasonTeamResponseDto> {
    const team = await this.seasonTeamRepository.findOne(
      { id: teamId, seasonMonth },
      { populate: ['leaderId'] },
    );
    if (!team) {
      throw new NotFoundException('season_team.not_found');
    }

    const members = await this.seasonTeamMemberRepository.find(
      { seasonMonth, teamId: team.id },
      {
        populate: [
          'gameProfileId',
          'gameProfileId.userId',
          'gameProfileId.equippedAchievementId',
        ],
        orderBy: { joinedAt: 'asc' },
      },
    );

    return {
      id: team.id,
      seasonMonth: team.seasonMonth,
      code: team.code ?? null,
      name: team.name ?? null,
      leaderGameProfileId: team.leaderId.id,
      maxMembers: TEAM_MAX_MEMBERS,
      currentMembers: members.length,
      members: members.map((m) => ({
        gameProfileId: m.gameProfileId.id,
        displayName: m.gameProfileId.userId?.displayName
          ? String(m.gameProfileId.userId.displayName)
          : null,
        imgUrl: m.gameProfileId.userId
          ? getProxyAvatarUrl(
              m.gameProfileId.userId.imgUrl,
              m.gameProfileId.userId.id,
              m.gameProfileId.userId.updatedAt,
            )
          : null,
        badgeImageUrl: (() => {
          const equipped = m.gameProfileId.equippedAchievementId;
          if (!equipped) return null;
          const expiresAt = getEffectiveExpiresAt(
            equipped.type,
            equipped.seasonMonth,
            equipped.expiresAt,
          );
          if (
            equipped.type === 'SEASONAL' &&
            expiresAt &&
            expiresAt < new Date()
          ) {
            return null;
          }
          return getProxyMediaUrl(equipped.badgeImageUrl);
        })(),
        joinedAt: m.joinedAt,
        isLeader: m.gameProfileId.id === team.leaderId.id,
      })),
    };
  }
}
