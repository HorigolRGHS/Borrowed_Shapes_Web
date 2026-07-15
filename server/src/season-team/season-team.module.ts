import { Module } from '@nestjs/common';
import { SeasonTeamService } from './season-team.service';
import { SeasonTeamController } from './season-team.controller';

import { SeasonTeamRepository } from './repositories/season-team.repository';
import { SeasonTeamMemberRepository } from './repositories/season-team-member.repository';

@Module({
  controllers: [SeasonTeamController],
  providers: [SeasonTeamService, SeasonTeamRepository, SeasonTeamMemberRepository],
})
export class SeasonTeamModule {}
