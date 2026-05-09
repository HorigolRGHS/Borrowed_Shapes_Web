import { AuthGuard } from './auth.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockJwt = {
  verifyAsync: jest.fn(),
};

const mockRedis = {
  hgetall: jest.fn(),
};

const mockEm = {
  findOne: jest.fn(),
  flush: jest.fn(),
};

const mockConfig = {
  get: jest.fn().mockReturnValue('test-secret'),
};

function makeContext(authHeader?: string): ExecutionContext {
  const req: any = {
    headers: { authorization: authHeader },
    user: undefined,
    ip: '127.0.0.1',
  };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    guard = new AuthGuard(
      mockReflector as any,
      mockJwt as any,
      mockConfig as any,
      mockEm as any,
      mockRedis as any,
    );
    jest.clearAllMocks();
    mockConfig.get.mockReturnValue('test-secret');
    mockEm.findOne.mockResolvedValue({ id: 'user_1', role: 'USER', isBanned: false, deletedAt: null });
  });

  it('allows @Public() routes without a token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(makeContext());
    expect(result).toBe(true);
  });

  it('throws 401 when Authorization header is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it('throws 401 when JWT verification fails', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockJwt.verifyAsync.mockRejectedValue(new Error('invalid token'));
    await expect(guard.canActivate(makeContext('Bearer bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('attaches req.user and returns true for a valid JWT', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false);
    mockJwt.verifyAsync.mockResolvedValue({ sub: 'user_1', sid: 'sess_1', platform: 'web', role: 'USER' });
    mockRedis.hgetall.mockResolvedValue({ sessionId: 'sess_1' });

    const ctx = makeContext('Bearer valid-token');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toMatchObject({
      userId: 'user_1',
      role: 'USER',
      platform: 'web',
      sessionId: 'sess_1',
    });
  });
});
