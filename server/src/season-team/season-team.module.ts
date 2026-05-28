import { Module } from '@nestjs/common';
import { SeasonTeamService } from './season-team.service';
import { SeasonTeamController } from './season-team.controller';

@Module({
  controllers: [SeasonTeamController],
  providers: [SeasonTeamService],
})
export class SeasonTeamModule {}
