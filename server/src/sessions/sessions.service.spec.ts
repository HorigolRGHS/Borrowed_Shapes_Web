import { Test } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockRedis = {
  hset: jest.fn(),
  expire: jest.fn(),
  zadd: jest.fn(),
  hgetall: jest.fn(),
  hgetallMany: jest.fn(),
  pipeline: jest.fn(),
  del: jest.fn(),
  zrem: jest.fn(),
};

const mockEm = {
  findOne: jest.fn(),
  find: jest.fn(),
  nativeUpdate: jest.fn(),
  create: jest.fn((_, data) => data),
  flush: jest.fn(),
  getReference: jest.fn((_, id) => ({ id })),
};

const mockConfig = {
  get: jest.fn((key: string, def: any) => {
    const map: Record<string, any> = { SESSION_TTL_SEC: 604800 };
    return map[key] ?? def;
  }),
};

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: EntityManager, useValue: mockEm },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(SessionsService);
    jest.clearAllMocks();
    mockEm.flush.mockResolvedValue(undefined);
    mockEm.nativeUpdate.mockResolvedValue(1);
    mockEm.create.mockImplementation((_, data) => data);
  });

  describe('heartbeat', () => {
    it('updates lastActive in Redis and resets TTL via pipeline', async () => {
      mockRedis.pipeline.mockResolvedValue(undefined);

      await service.heartbeat('user_1', 'web');

      expect(mockRedis.pipeline).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ cmd: 'hset', args: expect.arrayContaining(['rt:user_1:web']) }),
          expect.objectContaining({ cmd: 'expire', args: ['rt:user_1:web', 604800] }),
        ]),
      );
    });
  });

  describe('revoke', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockEm.findOne.mockResolvedValue(null);
      await expect(service.revoke('db_id_1', 'user_1', 'USER', '127.0.0.1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-owner non-admin tries to revoke', async () => {
      mockEm.findOne.mockResolvedValue({
        id: 'db_id_1',
        user: { id: 'other_user' },
        sessionId: 'sess_1',
        platform: 'web',
      });
      await expect(service.revoke('db_id_1', 'user_1', 'USER', '127.0.0.1')).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to revoke any session', async () => {
      mockEm.findOne.mockResolvedValue({
        id: 'db_id_1',
        user: { id: 'other_user' },
        sessionId: 'sess_1',
        platform: null,
      });

      await expect(service.revoke('db_id_1', 'admin_user', 'ADMIN', '127.0.0.1')).resolves.toBeUndefined();
    });

    it('deletes Redis key and updates DB to REVOKED when platform matches', async () => {
      mockEm.findOne.mockResolvedValue({
        id: 'db_id_1',
        user: { id: 'user_1' },
        sessionId: 'sess_1',
        platform: 'web',
      });
      mockRedis.hgetall.mockResolvedValue({ sessionId: 'sess_1' });
      mockRedis.del.mockResolvedValue(undefined);
      mockRedis.zrem.mockResolvedValue(undefined);

      await service.revoke('db_id_1', 'user_1', 'USER', '127.0.0.1');

      expect(mockRedis.del).toHaveBeenCalledWith('rt:user_1:web');
      expect(mockRedis.zrem).toHaveBeenCalledWith('online_users_by_last_active', 'sess_1');
      expect(mockEm.nativeUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: 'db_id_1' }),
        expect.objectContaining({ status: 'REVOKED' }),
      );
    });
  });
});
