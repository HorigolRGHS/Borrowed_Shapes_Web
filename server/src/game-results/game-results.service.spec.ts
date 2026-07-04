import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GameResultService } from './game-results.service';
import { GameRun } from '../entities/GameRun';
import { GameResultRepository } from './game-results.repository';

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
            execute: jest.fn(),
            findOne: jest.fn(),
            removeAndFlush: jest.fn(),
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
      const executeSpy = jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 1 }]) // count query
        .mockResolvedValueOnce([mockRunRow]) // data query
        .mockResolvedValueOnce([mockPlayerRow]); // players query

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
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it('should_filter_by_isCompleted_when_provided (Normal)', async () => {
      const executeSpy = jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockRunRow])
        .mockResolvedValueOnce([mockPlayerRow]);

      await service.findAllPaginated({ isCompleted: true });

      const countCall = executeSpy.mock.calls[0];
      expect(countCall[0]).toContain('"isCompleted"');
      expect(countCall[1]).toContain(true);
    });

    it('should_filter_by_search_when_provided (Normal)', async () => {
      const executeSpy = jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockRunRow])
        .mockResolvedValueOnce([mockPlayerRow]);

      await service.findAllPaginated({ search: 'Test' });

      const countCall = executeSpy.mock.calls[0];
      expect(countCall[0]).toContain('ILIKE');
      expect(countCall[1]).toContain('%Test%');
    });

    it('should_filter_by_isPrivate_when_provided (Normal)', async () => {
      const executeSpy = jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockRunRow])
        .mockResolvedValueOnce([mockPlayerRow]);

      await service.findAllPaginated({ isPrivate: false });

      const countCall = executeSpy.mock.calls[0];
      expect(countCall[0]).toContain('"isPrivate"');
      expect(countCall[1]).toContain(false);
    });

    it('should_filter_by_date_range_when_provided (Normal)', async () => {
      const executeSpy = jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      await service.findAllPaginated({
        startFrom: '2026-01-01T00:00:00Z',
        startTo: '2026-12-31T23:59:59Z',
      });

      const countCall = executeSpy.mock.calls[0];
      expect(countCall[0]).toContain('"startedAt" >=');
      expect(countCall[0]).toContain('"startedAt" <=');
    });

    it('should_clamp_page_to_minimum_1_when_invalid (Boundary)', async () => {
      jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.findAllPaginated({ page: -5, limit: 10 });
      expect(result.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should_return_run_details_when_found (Normal)', async () => {
      jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([mockRunRow]) // run query
        .mockResolvedValueOnce([mockPlayerRow]) // run players
        .mockResolvedValueOnce([mockSessionRow]) // sessions
        .mockResolvedValueOnce([mockSessionPlayerRow]); // session players

      const result = await service.findOne('run-1');

      expect(result.id).toBe('run-1');
      expect(result.totalSessions).toBe(6);
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].levelId).toBe('map_01');
      expect(result.sessions[0].players).toHaveLength(1);
      expect(result.players).toHaveLength(1);
    });

    it('should_throw_not_found_when_run_missing (Abnormal)', async () => {
      jest.spyOn(repository, 'execute').mockResolvedValueOnce([]);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_not_found_when_rows_null (Boundary)', async () => {
      jest.spyOn(repository, 'execute').mockResolvedValueOnce(null as any);

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
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([mockProfileRow]) // profile query
        .mockResolvedValueOnce([{ count: 1 }]) // count query
        .mockResolvedValueOnce([mockHistoryRun]) // runs query
        .mockResolvedValueOnce([mockPlayerRow]); // players query

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
      jest.spyOn(repository, 'execute').mockResolvedValueOnce([]);

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
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([mockProfileRow])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockNonHostRun])
        .mockResolvedValueOnce([mockPlayerRow]);

      const result = await service.findPlayerHistory('gp-1', {
        page: 1,
        limit: 10,
      });

      expect(result.items[0].playerRole).toBe('PLAYER');
    });

    it('should_sort_by_totalTimeSec_asc_when_requested (Normal)', async () => {
      const executeSpy = jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([mockProfileRow])
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([]);

      await service.findPlayerHistory('gp-1', {
        page: 1,
        limit: 10,
        sortBy: 'totalTimeSec',
        order: 'asc',
      });

      const dataQueryCall = executeSpy.mock.calls[2];
      expect(dataQueryCall[0]).toContain('ORDER BY gr."totalTimeSec" asc');
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
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([leaderboardRow])
        .mockResolvedValueOnce([mockPlayerRow]);

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
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

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
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 11 }])
        .mockResolvedValueOnce(rows)
        .mockResolvedValueOnce([mockPlayerRow]);

      const result = await service.getLeaderboard({ page: 2, limit: 10 });

      expect(result.items[0].rank).toBe(11);
      expect(result.items[0].players).toHaveLength(1);
    });

    it('should_filter_seasonal_leaderboard_by_given_month (Normal)', async () => {
      const executeSpy = jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([{
          runId: 'run-1',
          lobbyName: 'Seasonal Lobby',
          totalTimeSec: 150,
          completedAt: new Date('2026-06-15T12:00:00Z'),
          totalPlayers: 2,
        }])
        .mockResolvedValueOnce([mockPlayerRow]);

      const result = await service.getLeaderboard({
        scope: 'seasonal',
        seasonMonth: '2026-06',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].lobbyName).toBe('Seasonal Lobby');
      
      const countCall = executeSpy.mock.calls[0];
      expect(countCall[0]).toContain('"completedAt" >=');
      expect(countCall[0]).toContain('"completedAt" <');
      expect(countCall[0]).toContain('"lobbyCode" IN (SELECT st.code');
      
      const startParam = countCall[1]![0];
      const endParam = countCall[1]![1];
      const seasonMonthParam = countCall[1]![2];
      expect(startParam.getUTCFullYear()).toBe(2026);
      expect(startParam.getUTCMonth()).toBe(5); // 0-indexed (June is 5)
      expect(startParam.getUTCDate()).toBe(1);
      expect(endParam.getUTCFullYear()).toBe(2026);
      expect(endParam.getUTCMonth()).toBe(6); // 0-indexed (July is 6)
      expect(endParam.getUTCDate()).toBe(1);
      expect(seasonMonthParam).toBe('2026-06-01');
    });

    it('should_default_to_current_month_when_seasonal_has_invalid_month_format (Abnormal)', async () => {
      const executeSpy = jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      await service.getLeaderboard({
        scope: 'seasonal',
        seasonMonth: 'invalid-month',
      });

      const countCall = executeSpy.mock.calls[0];
      expect(countCall[0]).toContain('"completedAt" >=');
      
      const startParam = countCall[1]![0];
      const now = new Date();
      expect(startParam.getUTCFullYear()).toBe(now.getUTCFullYear());
      expect(startParam.getUTCMonth()).toBe(now.getUTCMonth());
    });

    it('should_return_empty_seasonal_leaderboard_when_no_runs_in_month (Boundary)', async () => {
      jest
        .spyOn(repository, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.getLeaderboard({
        scope: 'seasonal',
        seasonMonth: '2026-02',
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
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
