import { Test, TestingModule } from '@nestjs/testing';
import { SeasonTeamController } from './season-team.controller';
import { SeasonTeamService } from './season-team.service';

const mockSeasonTeamService = {
  createTeam: jest.fn(),
  joinTeam: jest.fn(),
  getMyTeam: jest.fn(),
  kickMember: jest.fn(),
  leaveTeam: jest.fn(),
  deleteTeam: jest.fn(),
};

describe('SeasonTeamController', () => {
  let controller: SeasonTeamController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeasonTeamController],
      providers: [
        { provide: SeasonTeamService, useValue: mockSeasonTeamService },
      ],
    }).compile();

    controller = module.get<SeasonTeamController>(SeasonTeamController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
