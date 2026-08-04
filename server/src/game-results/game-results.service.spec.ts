import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GameResultService } from './game-results.service';
import { GameRun } from '../entities/GameRun';
import { GameResultRepository } from './repositories/game-results.repository';

describe('GameResultService', () => {
  let service: GameResultService;
  let repository: GameResultRepository;

  const mockRunRow = {
    id: 'run-1',
    lobbyCode: 'ABC123',
    lobbyName: 'Test Lobby',
    isPrivate: false,
    totalLevels: 5,
    isCompleted: true,
    totalTimeSec: 120,
    startedAt: new Date('2026-01-01T00:00:00Z'),
    completedAt: new Date('2026-01-01T00:02:00Z'),
  };

  const mockPlayerRow = {
    gameProfileId: 'gp-1',
    displayName: 'Player1',
    avatarUrl: 'http://example.com/avatar.png',
    isHost: true,
    joinedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const mockSessionRow = {
    id: 'session-1',
    levelId: 'map_01',
    levelName: 'Kitchen',
    levelOrder: 1,
    status: 'FINISHED',
    result: 'WIN',
    completionTimeSec: 40,
    startedAt: new Date('2026-01-01T00:00:00Z'),
    endedAt: new Date('2026-01-01T00:00:40Z'),
  };

  const mockSessionPlayerRow = {
    gameProfileId: 'gp-1',
    displayName: 'Player1',
    avatarUrl: 'http://example.com/avatar.png',
    isAbsent: false,
    leftAt: null,
  };

  const mockProfileRow = {
    gameProfileId: 'gp-1',
    displayName: 'Player1',
    avatarUrl: 'http://example.com/avatar.png',
    totalSessions: 7,
    totalWins: 6,
    totalLosses: 0,
    totalAbandoned: 1,
    totalPlayTime: 45262,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameResultService,
        {
          provide: GameResultRepository,
          useValue: {
            findOne: jest.fn(),
            removeAndFlush: jest.fn(),
            findPaginatedRuns: jest.fn(),
            findRunById: jest.fn(),
            getRunPlayers: jest.fn(),
            getRunSessions: jest.fn(),
            getSessionPlayers: jest.fn(),
            findPlayerProfile: jest.fn(),
            countPlayerRuns: jest.fn(),
            findRunHistoryForPlayer: jest.fn(),
            getLeaderboardData: jest.fn(),
            getAvailableSeasons: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GameResultService>(GameResultService);
    repository = module.get<GameResultRepository>(GameResultRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should_return_paginated_runs_when_valid_query (Normal)', async () => {
      jest
        .spyOn(repository, 'findPaginatedRuns')
        .mockResolvedValue({ rows: [mockRunRow], total: 1 });
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);
      jest.spyOn(repository, 'getRunSessions').mockResolvedValue([]);

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('run-1');
      expect(result.items[0].totalLevels).toBe(5);
      expect(result.items[0].totalSessions).toBe(6);
      expect(result.items[0].players).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should_return_empty_list_when_no_runs_exist (Boundary)', async () => {
      jest
        .spyOn(repository, 'findPaginatedRuns')
        .mockResolvedValue({ rows: [], total: 0 });

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it('should_filter_by_isCompleted_when_provided (Normal)', async () => {
      const spy = jest
        .spyOn(repository, 'findPaginatedRuns')
        .mockResolvedValue({ rows: [mockRunRow], total: 1 });
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);
      jest.spyOn(repository, 'getRunSessions').mockResolvedValue([]);

      await service.findAllPaginated({ isCompleted: true });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ isCompleted: true }),
      );
    });

    it('should_filter_by_search_when_provided (Normal)', async () => {
      const spy = jest
        .spyOn(repository, 'findPaginatedRuns')
        .mockResolvedValue({ rows: [mockRunRow], total: 1 });
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);
      jest.spyOn(repository, 'getRunSessions').mockResolvedValue([]);

      await service.findAllPaginated({ search: 'Test' });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Test' }),
      );
    });

    it('should_filter_by_isPrivate_when_provided (Normal)', async () => {
      const spy = jest
        .spyOn(repository, 'findPaginatedRuns')
        .mockResolvedValue({ rows: [mockRunRow], total: 1 });
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);
      jest.spyOn(repository, 'getRunSessions').mockResolvedValue([]);

      await service.findAllPaginated({ isPrivate: false });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ isPrivate: false }),
      );
    });

    it('should_filter_by_date_range_when_provided (Normal)', async () => {
      const spy = jest
        .spyOn(repository, 'findPaginatedRuns')
        .mockResolvedValue({ rows: [], total: 0 });

      await service.findAllPaginated({
        startFrom: '2026-01-01T00:00:00Z',
        startTo: '2026-12-31T23:59:59Z',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          startFrom: '2026-01-01T00:00:00Z',
          startTo: '2026-12-31T23:59:59Z',
        }),
      );
    });

    it('should_clamp_page_to_minimum_1_when_invalid (Boundary)', async () => {
      const spy = jest
        .spyOn(repository, 'findPaginatedRuns')
        .mockResolvedValue({ rows: [], total: 0 });

      const result = await service.findAllPaginated({ page: -5, limit: 10 });
      expect(result.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should_return_run_details_when_found (Normal)', async () => {
      jest.spyOn(repository, 'findRunById').mockResolvedValue(mockRunRow);
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);
      jest
        .spyOn(repository, 'getRunSessions')
        .mockResolvedValue([mockSessionRow]);
      jest
        .spyOn(repository, 'getSessionPlayers')
        .mockResolvedValue([mockSessionPlayerRow]);

      const result = await service.findOne('run-1');

      expect(result.id).toBe('run-1');
      expect(result.totalSessions).toBe(6);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].levelId).toBe('map_01');
      expect(result.sessions[0].players).toHaveLength(1);
      expect(result.players).toHaveLength(1);
    });

    it('should_throw_not_found_when_run_missing (Abnormal)', async () => {
      jest.spyOn(repository, 'findRunById').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_not_found_when_rows_null (Boundary)', async () => {
      jest.spyOn(repository, 'findRunById').mockResolvedValue(null);

      await expect(service.findOne('null-result')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPlayerHistory', () => {
    it('should_return_player_info_stats_and_runs_when_found (Normal)', async () => {
      const mockHistoryRun = {
        id: 'run-1',
        lobbyName: 'Test Lobby',
        totalTimeSec: 120,
        startedAt: new Date('2026-01-01T00:00:00Z'),
        isHost: true,
      };

      jest
        .spyOn(repository, 'findPlayerProfile')
        .mockResolvedValue(mockProfileRow);
      jest.spyOn(repository, 'countPlayerRuns').mockResolvedValue(1);
      jest
        .spyOn(repository, 'findRunHistoryForPlayer')
        .mockResolvedValue([mockHistoryRun]);
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);

      const result = await service.findPlayerHistory('gp-1', {
        page: 1,
        limit: 10,
      });

      expect(result.playerInfo.gameProfileId).toBe('gp-1');
      expect(result.playerInfo.displayName).toBe('Player1');
      expect(result.playerStats.totalSessions).toBe(7);
      expect(result.playerStats.totalWins).toBe(6);
      expect(result.playerStats.totalLosses).toBe(0);
      expect(result.playerStats.totalAbandoned).toBe(1);
      expect(result.playerStats.totalPlayTimeSec).toBe(45262);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].playerRole).toBe('HOST');
      expect(result.total).toBe(1);
    });

    it('should_throw_not_found_when_profile_missing (Abnormal)', async () => {
      jest.spyOn(repository, 'findPlayerProfile').mockResolvedValue(null);

      await expect(
        service.findPlayerHistory('non-existent', { page: 1, limit: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should_return_PLAYER_role_when_not_host (Boundary)', async () => {
      const mockNonHostRun = {
        id: 'run-2',
        lobbyName: 'Other Lobby',
        totalTimeSec: 200,
        startedAt: new Date('2026-02-01T00:00:00Z'),
        isHost: false,
      };

      jest
        .spyOn(repository, 'findPlayerProfile')
        .mockResolvedValue(mockProfileRow);
      jest.spyOn(repository, 'countPlayerRuns').mockResolvedValue(1);
      jest
        .spyOn(repository, 'findRunHistoryForPlayer')
        .mockResolvedValue([mockNonHostRun]);
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);

      const result = await service.findPlayerHistory('gp-1', {
        page: 1,
        limit: 10,
      });

      expect(result.items[0].playerRole).toBe('PLAYER');
    });

    it('should_sort_by_totalTimeSec_asc_when_requested (Normal)', async () => {
      jest
        .spyOn(repository, 'findPlayerProfile')
        .mockResolvedValue(mockProfileRow);
      jest.spyOn(repository, 'countPlayerRuns').mockResolvedValue(1);
      const spy = jest
        .spyOn(repository, 'findRunHistoryForPlayer')
        .mockResolvedValue([]);

      await service.findPlayerHistory('gp-1', {
        page: 1,
        limit: 10,
        sortBy: 'totalTimeSec',
        order: 'asc',
      });

      expect(spy).toHaveBeenCalledWith(
        'gp-1',
        expect.objectContaining({
          sortBy: 'totalTimeSec',
          order: 'asc',
        }),
      );
    });
  });

  describe('getLeaderboard', () => {
    it('should_return_leaderboard_with_lobby_name_and_player_count (Normal)', async () => {
      const leaderboardRow = {
        runId: 'run-1',
        lobbyName: 'Prismatic Elite',
        totalTimeSec: 120,
        completedAt: new Date('2026-01-01T00:02:00Z'),
        totalPlayers: 4,
      };

      jest
        .spyOn(repository, 'getLeaderboardData')
        .mockResolvedValue({ rows: [leaderboardRow], total: 1 });
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);

      const result = await service.getLeaderboard({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].rank).toBe(1);
      expect(result.items[0].lobbyName).toBe('Prismatic Elite');
      expect(result.items[0].totalPlayers).toBe(4);
      expect(result.items[0].totalTimeSec).toBe(120);
      expect(result.items[0].players).toHaveLength(1);
      expect(result.items[0].players?.[0].displayName).toBe('Player1');
    });

    it('should_return_empty_leaderboard_when_no_completed_runs (Boundary)', async () => {
      jest
        .spyOn(repository, 'getLeaderboardData')
        .mockResolvedValue({ rows: [], total: 0 });

      const result = await service.getLeaderboard({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should_calculate_correct_rank_on_page_2 (Boundary)', async () => {
      const rows = [
        {
          runId: 'run-11',
          lobbyName: 'Team 11',
          totalTimeSec: 200,
          completedAt: new Date(),
          totalPlayers: 3,
        },
      ];

      jest
        .spyOn(repository, 'getLeaderboardData')
        .mockResolvedValue({ rows: rows, total: 11 });
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);

      const result = await service.getLeaderboard({ page: 2, limit: 10 });

      expect(result.items[0].rank).toBe(11);
      expect(result.items[0].players).toHaveLength(1);
    });

    it('should_filter_seasonal_leaderboard_by_given_month (Normal)', async () => {
      const leaderboardRow = {
        runId: 'run-1',
        lobbyName: 'Seasonal Lobby',
        totalTimeSec: 150,
        completedAt: new Date('2026-06-15T12:00:00Z'),
        totalPlayers: 2,
      };

      const spy = jest
        .spyOn(repository, 'getLeaderboardData')
        .mockResolvedValue({ rows: [leaderboardRow], total: 1 });
      jest
        .spyOn(repository, 'getRunPlayers')
        .mockResolvedValue([mockPlayerRow]);

      const result = await service.getLeaderboard({
        scope: 'seasonal',
        seasonMonth: '2026-06',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].lobbyName).toBe('Seasonal Lobby');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'seasonal',
          seasonMonth: '2026-06',
        }),
      );
    });

    it('should_default_to_current_month_when_seasonal_has_invalid_month_format (Abnormal)', async () => {
      const spy = jest
        .spyOn(repository, 'getLeaderboardData')
        .mockResolvedValue({ rows: [], total: 0 });

      await service.getLeaderboard({
        scope: 'seasonal',
        seasonMonth: 'invalid-month',
      });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'seasonal',
          seasonMonth: 'invalid-month',
        }),
      );
    });

    it('should_return_empty_seasonal_leaderboard_when_no_runs_in_month (Boundary)', async () => {
      jest
        .spyOn(repository, 'getLeaderboardData')
        .mockResolvedValue({ rows: [], total: 0 });

      const result = await service.getLeaderboard({
        scope: 'seasonal',
        seasonMonth: '2026-02',
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getAvailableSeasons', () => {
    it('should_return_available_seasons (Normal)', async () => {
      const mockSeasons = [
        { seasonMonth: '2026-08', label: 'Tháng 8/2026' },
        { seasonMonth: '2026-07', label: 'Tháng 7/2026' },
      ];
      jest.spyOn(repository, 'getAvailableSeasons').mockResolvedValue(mockSeasons);

      const result = await service.getAvailableSeasons();

      expect(result).toHaveLength(2);
      expect(result[0].seasonMonth).toBe('2026-08');
    });
  });

  describe('delete', () => {
    it('should_delete_run_when_found (Normal)', async () => {
      const mockRun = new GameRun();
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockRun);
      jest.spyOn(repository, 'removeAndFlush').mockResolvedValue();

      await expect(service.delete('run-1')).resolves.toBeUndefined();
      expect(repository.removeAndFlush).toHaveBeenCalledWith(mockRun);
    });

    it('should_throw_not_found_when_deleting_missing_run (Abnormal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
