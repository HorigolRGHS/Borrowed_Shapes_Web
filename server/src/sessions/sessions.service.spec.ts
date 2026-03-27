import { Test } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
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

const mockPrisma = {
  userSession: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
  },
  auditLog: { create: jest.fn() },
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
        { provide: RedisService, useValue: mockRedis },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(SessionsService);
    jest.clearAllMocks();
  });

  describe('heartbeat', () => {
    it('updates lastActive in Redis and resets TTL via pipeline', async () => {
      mockRedis.pipeline.mockResolvedValue(undefined);

      await service.heartbeat('user_1', 'forum');

      expect(mockRedis.pipeline).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ cmd: 'hset', args: expect.arrayContaining(['rt:user_1:forum']) }),
          expect.objectContaining({ cmd: 'expire', args: ['rt:user_1:forum', 604800] }),
        ]),
      );
    });
  });

  describe('revoke', () => {
    it('throws NotFoundException when session does not exist', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue(null);
      await expect(service.revoke('db_id_1', 'user_1', 'USER', '127.0.0.1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when non-owner non-admin tries to revoke', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'db_id_1',
        userId: 'other_user',
        sessionId: 'sess_1',
        platform: 'forum',
      });
      await expect(service.revoke('db_id_1', 'user_1', 'USER', '127.0.0.1')).rejects.toThrow(ForbiddenException);
    });

    it('allows ADMIN to revoke any session', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'db_id_1',
        userId: 'other_user',
        sessionId: 'sess_1',
        platform: null,
      });
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await expect(service.revoke('db_id_1', 'admin_user', 'ADMIN', '127.0.0.1')).resolves.toBeUndefined();
    });

    it('deletes Redis key and updates DB to REVOKED when platform matches', async () => {
      mockPrisma.userSession.findUnique.mockResolvedValue({
        id: 'db_id_1',
        userId: 'user_1',
        sessionId: 'sess_1',
        platform: 'forum',
      });
      mockRedis.hgetall.mockResolvedValue({ sessionId: 'sess_1' });
      mockRedis.del.mockResolvedValue(undefined);
      mockRedis.zrem.mockResolvedValue(undefined);
      mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.revoke('db_id_1', 'user_1', 'USER', '127.0.0.1');

      expect(mockRedis.del).toHaveBeenCalledWith('rt:user_1:forum');
      expect(mockRedis.zrem).toHaveBeenCalledWith('online_users_by_last_active', 'sess_1');
      expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'REVOKED' }) }),
      );
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ actionType: 'REVOKE_SESSION' }),
        }),
      );
    });
  });
});
