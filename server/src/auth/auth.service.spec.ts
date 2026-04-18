import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { RedisService } from '../redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockEm = {
  findOne: jest.fn(),
  create: jest.fn(),
  flush: jest.fn(),
  nativeUpdate: jest.fn(),
  getReference: jest.fn((_, id) => ({ id })),
  transactional: jest.fn(),
};

const mockRedis = {
  hgetall: jest.fn(),
  pipeline: jest.fn().mockResolvedValue(undefined),
  del: jest.fn(),
  zrem: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, def: any) => {
    const map: Record<string, any> = {
      BCRYPT_ROUNDS: 4,
      SESSION_TTL_SEC: 604800,
      ACCESS_TOKEN_TTL_SEC: 900,
    };
    return map[key] ?? def;
  }),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('signed-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EntityManager, useValue: mockEm },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('signed-token');
    mockEm.flush.mockResolvedValue(undefined);
    mockEm.nativeUpdate.mockResolvedValue(1);
    mockEm.create.mockImplementation((_, data) => data);
  });

  describe('register', () => {
    it('creates User and GameProfile in a transaction', async () => {
      const createdUser = { id: 'user_1', email: 'a@b.com', role: 'USER', displayName: null };
      mockEm.transactional.mockImplementation(async (fn: Function) => {
        const result = await fn(mockEm);
        return result;
      });
      mockEm.create.mockImplementationOnce((_, data) => ({ ...data, id: 'user_1' }));

      const result = await service.register({ email: 'a@b.com', password: 'password123' }, '127.0.0.1');

      expect(mockEm.transactional).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ userId: 'user_1', email: 'a@b.com' });
    });

    it('throws ConflictException on unique constraint violation (email)', async () => {
      const err = new UniqueConstraintViolationException(
        Object.assign(new Error('duplicate key'), { constraint: 'User_email_key' }),
      );
      mockEm.transactional.mockRejectedValue(err);

      await expect(
        service.register({ email: 'a@b.com', password: 'password123' }, '127.0.0.1'),
      ).rejects.toThrow('Email already in use');
    });

    it('throws ConflictException for duplicate displayName', async () => {
      const err = new UniqueConstraintViolationException(
        Object.assign(new Error('duplicate key'), { constraint: 'User_displayName_key' }),
      );
      mockEm.transactional.mockRejectedValue(err);

      await expect(
        service.register({ email: 'a@b.com', password: 'password123', displayName: 'taken' }, '127.0.0.1'),
      ).rejects.toThrow('Display name already taken');
    });

    it('throws generic conflict for unknown unique constraint', async () => {
      const err = new UniqueConstraintViolationException(
        Object.assign(new Error('duplicate key'), { constraint: 'Some_other_unique_key' }),
      );
      mockEm.transactional.mockRejectedValue(err);

      await expect(
        service.register({ email: 'a@b.com', password: 'password123' }, '127.0.0.1'),
      ).rejects.toThrow('Unique field already in use');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      mockEm.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nope@b.com', password: 'pass', platform: 'forum' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockEm.findOne.mockResolvedValue({ id: 'u1', passwordHash: '$2b$04$invalidhash', role: 'USER' });
      await expect(
        service.login({ email: 'a@b.com', password: 'wrongpass', platform: 'forum' }, '127.0.0.1'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('writes Redis keys and DB record on successful login', async () => {
      const hash = await bcrypt.hash('password123', 4);
      mockEm.findOne.mockResolvedValue({ id: 'u1', email: 'a@b.com', passwordHash: hash, role: 'USER' });
      mockRedis.hgetall.mockResolvedValue(null);
      mockRedis.pipeline.mockResolvedValue(undefined);

      const result = await service.login({ email: 'a@b.com', password: 'password123', platform: 'forum' }, '127.0.0.1');

      expect(mockRedis.pipeline).toHaveBeenCalledTimes(1);
      expect(mockEm.create).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toMatchObject({ accessToken: expect.any(String), refreshToken: expect.any(String) });
    });
  });

  describe('logout', () => {
    it('cleans up Redis keys and updates DB', async () => {
      mockRedis.hgetall.mockResolvedValue({ sessionId: 'sess_1' });
      mockRedis.del.mockResolvedValue(undefined);
      mockRedis.zrem.mockResolvedValue(undefined);

      await service.logout('u1', 'forum', '127.0.0.1');

      expect(mockRedis.del).toHaveBeenCalledWith('rt:u1:forum');
      expect(mockRedis.zrem).toHaveBeenCalledWith('online_users_by_last_active', 'sess_1');
      expect(mockEm.nativeUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ sessionId: 'sess_1' }),
        expect.objectContaining({ status: 'LOGGED_OUT' }),
      );
    });
  });
});
