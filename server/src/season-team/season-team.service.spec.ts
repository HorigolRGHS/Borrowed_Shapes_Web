import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { SeasonTeamService } from './season-team.service';

describe('SeasonTeamService', () => {
  let service: SeasonTeamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonTeamService,
        { provide: EntityManager, useValue: {} },
      ],
    }).compile();

    service = module.get<SeasonTeamService>(SeasonTeamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
