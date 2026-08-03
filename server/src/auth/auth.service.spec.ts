import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { UserRepository } from './repositories/user.repository';
import { AuditService } from '../audit/audit.service';
import { GameProfileRepository } from '../game/repositories/game-profile.repository';
import { UserSessionRepository } from '../sessions/repositories/user-session.repository';
import { UserOnlineStatusRepository } from '../presence/repositories/user-online-status.repository';

const mockEm: any = {
  findOne: jest.fn(),
  findByEmail: jest.fn((email) => mockEm.findOne('User', { email })),
  find: jest.fn(),
  create: jest.fn(),
  flush: jest.fn(),
  nativeUpdate: jest.fn(),
  getReference: jest.fn((_, id) => ({ id })),
  transactional: jest.fn(),
  txFindOne: jest.fn(),
  txCreate: jest.fn((_, data) => data),
  txFlush: jest.fn().mockResolvedValue(undefined),
};

const mockRedis = {
  hset: jest.fn(),
  hget: jest.fn(),
  hgetall: jest.fn(),
  expire: jest.fn(),
  pipeline: jest.fn().mockResolvedValue(undefined),
  del: jest.fn(),
  zrem: jest.fn(),
};

const mockAuditService = {
  recordStandalone: jest.fn().mockResolvedValue(undefined),
  recordInCurrentUnitOfWork: jest.fn().mockResolvedValue(undefined),
  recordInTransaction: jest.fn(),
};

const AuditActionType = {
  UPDATE: 'UPDATE',
  CREATE: 'CREATE',
  LOGOUT: 'LOGOUT',
  LOGIN: 'LOGIN',
  BAN_USER: 'BAN_USER',
  PROCESS_REPORT: 'PROCESS_REPORT',
};

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const mockEmail = {
  sendMail: jest.fn(),
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
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: mockConfig },
        { provide: JwtService, useValue: mockJwt },
        { provide: UserRepository, useValue: mockEm },
        { provide: AuditService, useValue: mockAuditService },
        { provide: GameProfileRepository, useValue: mockEm },
        { provide: UserSessionRepository, useValue: mockEm },
        { provide: UserOnlineStatusRepository, useValue: mockEm },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
    mockJwt.sign.mockReturnValue('signed-token');
    mockEm.flush.mockResolvedValue(undefined);
    mockEm.nativeUpdate.mockResolvedValue(1);
    mockEm.find.mockResolvedValue([]);
    mockEm.create.mockImplementation((_: any, data: any) => data);
    mockRedis.hset.mockResolvedValue(undefined);
    mockRedis.expire.mockResolvedValue(undefined);
    mockEmail.sendMail.mockResolvedValue(undefined);
  });

  describe('register', () => {
    it('creates User and GameProfile in a transaction', async () => {
      const createdUser = {
        id: 'user_1',
        email: 'a@b.com',
        role: 'USER',
        displayName: null,
      };
      mockEm.transactional.mockImplementation(async (fn: Function) => {
        const result = await fn(mockEm);
        return result;
      });
      mockEm.txCreate.mockImplementationOnce((_: any, data: any) => ({
        ...data,
        id: 'user_1',
      }));

      const result = await service.register(
        { email: 'a@b.com', password: 'password123', displayName: 'Test User' },
        '127.0.0.1',
      );

      expect(mockEm.transactional).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ userId: 'user_1', email: 'a@b.com' });
    });

    it('throws ConflictException on unique constraint violation (email)', async () => {
      const err = new UniqueConstraintViolationException(
        Object.assign(new Error('duplicate key'), {
          constraint: 'User_email_key',
        }),
      );
      mockEm.transactional.mockRejectedValue(err);

      await expect(
        service.register(
          {
            email: 'a@b.com',
            password: 'password123',
            displayName: 'Test User',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow('auth.email_in_use');
    });

    it('throws ConflictException for duplicate displayName', async () => {
      const err = new UniqueConstraintViolationException(
        Object.assign(new Error('duplicate key'), {
          constraint: 'User_displayName_key',
        }),
      );
      mockEm.transactional.mockRejectedValue(err);

      await expect(
        service.register(
          { email: 'a@b.com', password: 'password123', displayName: 'taken' },
          '127.0.0.1',
        ),
      ).rejects.toThrow('auth.unique_field_in_use');
    });

    it('throws generic conflict for unknown unique constraint', async () => {
      const err = new UniqueConstraintViolationException(
        Object.assign(new Error('duplicate key'), {
          constraint: 'Some_other_unique_key',
        }),
      );
      mockEm.transactional.mockRejectedValue(err);

      await expect(
        service.register(
          {
            email: 'a@b.com',
            password: 'password123',
            displayName: 'Test User',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow('auth.unique_field_in_use');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      mockEm.findOne.mockResolvedValue(null);
      await expect(
        service.login(
          { email: 'nope@b.com', password: 'pass', platform: 'web' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockEm.findOne.mockResolvedValue({
        id: 'u1',
        passwordHash: '$2b$04$invalidhash',
        role: 'USER',
      });
      await expect(
        service.login(
          { email: 'a@b.com', password: 'wrongpass', platform: 'web' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('writes Redis keys and DB record on successful login', async () => {
      const hash = await bcrypt.hash('password123', 4);
      mockEm.findOne.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        passwordHash: hash,
        role: 'USER',
      });
      mockRedis.hgetall.mockResolvedValue(null);
      mockRedis.pipeline.mockResolvedValue(undefined);

      const result = await service.login(
        { email: 'a@b.com', password: 'password123', platform: 'web' },
        '127.0.0.1',
      );

      expect(mockRedis.pipeline).toHaveBeenCalledTimes(1);
      expect(mockEm.create).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
    });
  });

  describe('logout', () => {
    it('cleans up Redis keys and updates DB', async () => {
      mockRedis.hgetall.mockResolvedValue({ sessionId: 'sess_1' });
      mockRedis.del.mockResolvedValue(undefined);
      mockRedis.pipeline.mockResolvedValue(undefined);

      await service.logout('u1', 'web', '127.0.0.1');

      expect(mockRedis.del).toHaveBeenCalledWith('rt:u1:web');
      expect(mockRedis.pipeline).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            cmd: 'zrem',
            args: ['online_users_by_last_active', 'sess_1'],
          }),
          expect.objectContaining({
            cmd: 'del',
            args: ['user_session_details:sess_1'],
          }),
        ]),
      );
      expect(mockEm.nativeUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'sess_1' }),
        expect.objectContaining({ status: 'LOGGED_OUT' }),
      );
    });
  });

  describe('changePassword', () => {
    it('keeps current platform session and revokes other active sessions', async () => {
      const hash = await bcrypt.hash('oldPass123!', 4);
      mockEm.findOne.mockResolvedValue({ id: 'u1', passwordHash: hash });
      mockEm.find.mockResolvedValue([
        { id: 's1', sessionId: 'sess_web', platform: 'web' },
        { id: 's2', sessionId: 'sess_game', platform: 'game' },
      ]);
      mockRedis.hgetall.mockImplementation(async (key: string) => {
        if (key === 'rt:u1:web') return { sessionId: 'sess_web' };
        if (key === 'rt:u1:game') return { sessionId: 'sess_game' };
        return null;
      });
      mockRedis.del.mockResolvedValue(undefined);
      mockRedis.zrem.mockResolvedValue(undefined);

      await service.changePassword(
        'u1',
        { oldPassword: 'oldPass123!', newPassword: 'NewPass123!' } as any,
        'web',
      );

      expect(mockRedis.del).toHaveBeenCalledWith('rt:u1:game');
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        'online_users_by_last_active',
        'sess_game',
      );
      expect(mockRedis.del).not.toHaveBeenCalledWith('rt:u1:web');
      expect(mockEm.nativeUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: 's2', status: 'ACTIVE' }),
        expect.objectContaining({ status: 'REVOKED' }),
      );

      expect(mockAuditService.recordInCurrentUnitOfWork).toHaveBeenCalledTimes(
        1,
      );
      expect(mockAuditService.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.UPDATE,
          userId: 'u1',
          entityName: 'User',
          entityId: 'u1',
          newValue: { operation: 'CHANGE_PASSWORD' },
        }),
      );

      const auditOrder =
        mockAuditService.recordInCurrentUnitOfWork.mock.invocationCallOrder[0];
      const flushOrder = mockEm.flush.mock.invocationCallOrder[0];
      expect(auditOrder).toBeLessThan(flushOrder);
    });

    it('should propagate audit error and not flush in changePassword', async () => {
      const hash = await bcrypt.hash('oldPass123!', 4);
      mockEm.findOne.mockResolvedValue({ id: 'u1', passwordHash: hash });
      mockAuditService.recordInCurrentUnitOfWork.mockRejectedValueOnce(
        new Error('Audit DB Down'),
      );

      await expect(
        service.changePassword(
          'u1',
          { oldPassword: 'oldPass123!', newPassword: 'NewPass123!' } as any,
          'web',
        ),
      ).rejects.toThrow('Audit DB Down');

      expect(mockEm.flush).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('revokes all active sessions after reset', async () => {
      const otp = '123456';
      const otpHash = sha256(otp);
      mockRedis.hgetall.mockImplementation(async (key: string) => {
        if (key === 'forgot_otp:player@example.com') {
          return { userId: 'u1', otpHash };
        }
        if (key === 'rt:u1:web') return { sessionId: 'sess_web' };
        if (key === 'rt:u1:game') return { sessionId: 'sess_game' };
        return null;
      });
      mockEm.findOne.mockResolvedValue({ id: 'u1' });
      mockEm.find.mockResolvedValue([
        { id: 's1', sessionId: 'sess_web', platform: 'web' },
        { id: 's2', sessionId: 'sess_game', platform: 'game' },
      ]);
      mockRedis.del.mockResolvedValue(undefined);
      mockRedis.zrem.mockResolvedValue(undefined);

      await service.resetPassword({
        email: 'player@example.com',
        otp,
        newPassword: 'NewPass123!',
      } as any);

      expect(mockRedis.del).toHaveBeenCalledWith('rt:u1:web');
      expect(mockRedis.del).toHaveBeenCalledWith('rt:u1:game');
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        'online_users_by_last_active',
        'sess_web',
      );
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        'online_users_by_last_active',
        'sess_game',
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        'forgot_otp:player@example.com',
      );

      expect(mockAuditService.recordInCurrentUnitOfWork).toHaveBeenCalledTimes(
        1,
      );
      expect(mockAuditService.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.UPDATE,
          userId: null,
          entityName: 'User',
          entityId: 'u1',
          newValue: { operation: 'RESET_PASSWORD' },
        }),
      );

      const auditOrder =
        mockAuditService.recordInCurrentUnitOfWork.mock.invocationCallOrder[0];
      const flushOrder = mockEm.flush.mock.invocationCallOrder[0];
      expect(auditOrder).toBeLessThan(flushOrder);
    });

    it('should propagate audit error and not flush in resetPassword', async () => {
      const otp = '123456';
      const otpHash = sha256(otp);
      mockRedis.hgetall.mockResolvedValue({ userId: 'u1', otpHash });
      mockEm.findOne.mockResolvedValue({ id: 'u1' });
      mockAuditService.recordInCurrentUnitOfWork.mockRejectedValueOnce(
        new Error('Audit DB Down'),
      );

      await expect(
        service.resetPassword({
          email: 'player@example.com',
          otp,
          newPassword: 'NewPass123!',
        } as any),
      ).rejects.toThrow('Audit DB Down');

      expect(mockEm.flush).not.toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    it('verifies email, unbans user, audits and flushes', async () => {
      mockRedis.hgetall.mockResolvedValue({ userId: 'u1' });
      const user = { id: 'u1', isBanned: true };
      mockEm.findOne.mockResolvedValue(user);
      mockRedis.del.mockResolvedValue(undefined);

      await service.verifyEmail({ token: 'abc' });

      expect(user.isBanned).toBe(false);

      expect(mockAuditService.recordInCurrentUnitOfWork).toHaveBeenCalledTimes(
        1,
      );
      expect(mockAuditService.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: AuditActionType.UPDATE,
          userId: null,
          entityName: 'User',
          entityId: 'u1',
          newValue: { operation: 'VERIFY_EMAIL' },
        }),
      );

      const auditOrder =
        mockAuditService.recordInCurrentUnitOfWork.mock.invocationCallOrder[0];
      const flushOrder = mockEm.flush.mock.invocationCallOrder[0];
      expect(auditOrder).toBeLessThan(flushOrder);
    });

    it('should propagate audit error and not flush in verifyEmail', async () => {
      mockRedis.hgetall.mockResolvedValue({ userId: 'u1' });
      mockEm.findOne.mockResolvedValue({ id: 'u1' });
      mockAuditService.recordInCurrentUnitOfWork.mockRejectedValueOnce(
        new Error('Audit DB Down'),
      );

      await expect(service.verifyEmail({ token: 'abc' })).rejects.toThrow(
        'Audit DB Down',
      );

      expect(mockEm.flush).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('should_return_equipped_achievement_when_seasonal_achievement_is_not_expired (Normal)', async () => {
      const user = {
        id: 'user_1',
        email: 'a@b.com',
        role: 'USER',
        displayName: 'Test User',
        imgUrl: null,
        updatedAt: new Date(),
      };
      const achievement = {
        id: 'ach_1',
        name: 'June Season Badge',
        badgeImageUrl: 'http://img.url/ach_1',
        type: 'SEASONAL',
        seasonMonth: '2026-06-01',
        expiresAt: new Date('2026-06-30T23:59:59.999Z'),
      };
      const gameProfile = {
        id: 'gp_1',
        equippedAchievementId: achievement,
      };

      mockEm.findOne.mockImplementation(async (filter: any) => {
        if (filter && filter.id === 'user_1') return user;
        if (filter && filter.userId === 'user_1') return gameProfile;
        return null;
      });

      // Mock date to June 28, 2026
      const mockDate = new Date('2026-06-28T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      const result = await service.me('user_1', 'web');

      expect(result.equippedAchievement).toEqual({
        id: 'ach_1',
        name: 'June Season Badge',
        badgeImageUrl: 'http://img.url/ach_1',
      });
      expect(mockEm.flush).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should_unequip_and_clear_achievement_when_seasonal_achievement_is_expired (Abnormal)', async () => {
      const user = {
        id: 'user_1',
        email: 'a@b.com',
        role: 'USER',
        displayName: 'Test User',
        imgUrl: null,
        updatedAt: new Date(),
      };
      const achievement = {
        id: 'ach_1',
        name: 'April Season Badge',
        badgeImageUrl: 'http://img.url/ach_1',
        type: 'SEASONAL',
        seasonMonth: '2026-04-01',
        expiresAt: new Date('2026-04-30T23:59:59.999Z'),
      };
      const gameProfile = {
        id: 'gp_1',
        equippedAchievementId: achievement,
      };

      mockEm.findOne.mockImplementation(async (filter: any) => {
        if (filter && filter.id === 'user_1') return user;
        if (filter && filter.userId === 'user_1') return gameProfile;
        return null;
      });

      // Mock date to June 28, 2026
      const mockDate = new Date('2026-06-28T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      const result = await service.me('user_1', 'web');

      expect(result.equippedAchievement).toBeNull();
      expect(gameProfile.equippedAchievementId).toBeUndefined();
      expect(mockEm.flush).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should_keep_equipped_achievement_when_achievement_is_permanent_even_if_expiredAt_is_past (Boundary)', async () => {
      const user = {
        id: 'user_1',
        email: 'a@b.com',
        role: 'USER',
        displayName: 'Test User',
        imgUrl: null,
        updatedAt: new Date(),
      };
      const achievement = {
        id: 'ach_1',
        name: 'Permanent Badge',
        badgeImageUrl: 'http://img.url/ach_1',
        type: 'PERMANENT',
        expiresAt: new Date('2026-05-30T23:59:59.999Z'),
      };
      const gameProfile = {
        id: 'gp_1',
        equippedAchievementId: achievement,
      };

      mockEm.findOne.mockImplementation(async (filter: any) => {
        if (filter && filter.id === 'user_1') return user;
        if (filter && filter.userId === 'user_1') return gameProfile;
        return null;
      });

      // Mock date to June 28, 2026
      const mockDate = new Date('2026-06-28T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      const result = await service.me('user_1', 'web');

      expect(result.equippedAchievement).toEqual({
        id: 'ach_1',
        name: 'Permanent Badge',
        badgeImageUrl: 'http://img.url/ach_1',
      });
      expect(mockEm.flush).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
