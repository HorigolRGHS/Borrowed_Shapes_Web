import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { SeasonTeamService } from './season-team.service';

import { SeasonTeamRepository } from './repositories/season-team.repository';
import { SeasonTeamMemberRepository } from './repositories/season-team-member.repository';
import { GameProfileRepository } from '../game/repositories/game-profile.repository';
import { AuditService } from '../audit/audit.service';

describe('SeasonTeamService', () => {
  let service: SeasonTeamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonTeamService,
        { provide: EntityManager, useValue: {} },
        { provide: SeasonTeamRepository, useValue: {} },
        { provide: SeasonTeamMemberRepository, useValue: {} },
        { provide: GameProfileRepository, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile();

    service = module.get<SeasonTeamService>(SeasonTeamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
