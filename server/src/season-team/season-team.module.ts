import { Module } from '@nestjs/common';
import { SeasonTeamController } from './season-team.controller';
import { SeasonTeamService } from './season-team.service';
import { SeasonTeamRepository } from './repositories/season-team.repository';
import { SeasonTeamMemberRepository } from './repositories/season-team-member.repository';
import { GameModule } from '../game/game.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [GameModule, AuditModule],
  controllers: [SeasonTeamController],
  providers: [
    SeasonTeamService,
    SeasonTeamRepository,
    SeasonTeamMemberRepository,
  ],
})
export class SeasonTeamModule {}
