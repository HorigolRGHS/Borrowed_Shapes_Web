import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { GameResultService } from './game-results.service';
import { GameRun } from '../entities/GameRun';

describe('GameResultService', () => {
  let service: GameResultService;
  let em: EntityManager;

  const mockRunRow = {
    id: 'run-1',
    lobbyCode: 'ABC123',
    lobbyName: 'Test Lobby',
    isPrivate: false,
    totalLevels: 3,
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
    levelName: 'Level 1',
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameResultService,
        {
          provide: EntityManager,
          useValue: {
            execute: jest.fn(),
            findOne: jest.fn(),
            removeAndFlush: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<GameResultService>(GameResultService);
    em = module.get<EntityManager>(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    it('should_return_paginated_runs_when_valid_query (Normal)', async () => {
      const executeSpy = jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])  // count query
        .mockResolvedValueOnce([mockRunRow])     // data query
        .mockResolvedValueOnce([mockPlayerRow]); // players query

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('run-1');
      expect(result.items[0].players).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should_return_empty_list_when_no_runs_exist (Boundary)', async () => {
      jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.findAllPaginated({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it('should_filter_by_isCompleted_when_provided (Normal)', async () => {
      const executeSpy = jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockRunRow])
        .mockResolvedValueOnce([mockPlayerRow]);

      await service.findAllPaginated({ isCompleted: true });

      const countCall = executeSpy.mock.calls[0];
      expect(countCall[0]).toContain('"isCompleted"');
      expect(countCall[1]).toContain(true);
    });

    it('should_clamp_page_to_minimum_1_when_invalid (Boundary)', async () => {
      jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.findAllPaginated({ page: -5, limit: 10 });
      expect(result.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should_return_run_details_when_found (Normal)', async () => {
      jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([mockRunRow])        // run query
        .mockResolvedValueOnce([mockPlayerRow])      // run players
        .mockResolvedValueOnce([mockSessionRow])     // sessions
        .mockResolvedValueOnce([mockSessionPlayerRow]); // session players

      const result = await service.findOne('run-1');

      expect(result.id).toBe('run-1');
      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].players).toHaveLength(1);
      expect(result.players).toHaveLength(1);
    });

    it('should_throw_not_found_when_run_missing (Abnormal)', async () => {
      jest.spyOn(em, 'execute').mockResolvedValueOnce([]);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should_throw_not_found_when_rows_null (Boundary)', async () => {
      jest.spyOn(em, 'execute').mockResolvedValueOnce(null);

      await expect(service.findOne('null-result')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLeaderboard', () => {
    it('should_return_ranked_leaderboard_when_completed_runs_exist (Normal)', async () => {
      const leaderboardRow = {
        runId: 'run-1',
        totalTimeSec: 120,
        completedAt: new Date('2026-01-01T00:02:00Z'),
        gameProfileId: 'gp-1',
        displayName: 'Player1',
        avatarUrl: 'http://example.com/avatar.png',
      };

      jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([leaderboardRow]);

      const result = await service.getLeaderboard({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].rank).toBe(1);
      expect(result.items[0].totalTimeSec).toBe(120);
      expect(result.items[0].displayName).toBe('Player1');
    });

    it('should_return_empty_leaderboard_when_no_completed_runs (Boundary)', async () => {
      jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([{ count: 0 }])
        .mockResolvedValueOnce([]);

      const result = await service.getLeaderboard({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should_calculate_correct_rank_on_page_2 (Boundary)', async () => {
      const rows = [
        { runId: 'run-11', totalTimeSec: 200, completedAt: new Date(), gameProfileId: 'gp-11', displayName: 'P11', avatarUrl: null },
      ];

      jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([{ count: 11 }])
        .mockResolvedValueOnce(rows);

      const result = await service.getLeaderboard({ page: 2, limit: 10 });

      expect(result.items[0].rank).toBe(11);
    });
  });

  describe('delete', () => {
    it('should_delete_run_when_found (Normal)', async () => {
      const mockRun = new GameRun();
      jest.spyOn(em, 'findOne').mockResolvedValue(mockRun);
      jest.spyOn(em, 'removeAndFlush').mockResolvedValue();

      await expect(service.delete('run-1')).resolves.toBeUndefined();
      expect(em.removeAndFlush).toHaveBeenCalledWith(mockRun);
    });

    it('should_throw_not_found_when_deleting_missing_run (Abnormal)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUser', () => {
    it('should_delegate_to_findAllPaginated_with_gameProfileId (Normal)', async () => {
      jest.spyOn(em, 'execute')
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([mockRunRow])
        .mockResolvedValueOnce([mockPlayerRow]);

      const spy = jest.spyOn(service, 'findAllPaginated');

      const result = await service.findByUser('gp-1', { page: 1, limit: 10 });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ gameProfileId: 'gp-1' }),
      );
      expect(result.items).toHaveLength(1);
    });
  });
});
