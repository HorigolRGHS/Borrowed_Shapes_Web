import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ROLES_KEY } from './decorators/roles.decorator';
import { User } from '../entities/User';
import { Role } from '../entities/Role';

const rtKey = (userId: string, platform: string) => `rt:${userId}:${platform}`;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private config: ConfigService,
    private em: EntityManager,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('AUTH.UNAUTHORIZED');

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_SECRET', 'change-me-in-production'),
      });

      const userId = payload.sub as string | undefined;
      const platform = (payload.pf ?? payload.platform) as string | undefined;
      const sessionId = payload.sid as string | undefined;
      const role = payload.role as string | undefined;
      if (!userId || !platform || !role) {
        throw new UnauthorizedException('AUTH.UNAUTHORIZED');
      }

      if (sessionId) {
        const stored = await this.redis.hgetall(rtKey(userId, platform));
        if (stored?.sessionId !== sessionId) {
          throw new UnauthorizedException('AUTH.UNAUTHORIZED');
        }
      }

      const user = await this.em.findOne(
        User,
        { id: userId },
        { fields: ['id', 'isBanned', 'bannedAt', 'banReason', 'banExpiresAt', 'deletedAt'] },
      );

      if (!user || user.deletedAt) {
        throw new UnauthorizedException('AUTH.UNAUTHORIZED');
      }

      const now = new Date();
      if (user.isBanned) {
        if (user.banExpiresAt && user.banExpiresAt <= now) {
          user.isBanned = false;
          user.bannedAt = undefined;
          user.banReason = undefined;
          user.banExpiresAt = undefined;
          await this.em.flush();
        } else {
          throw new ForbiddenException(user.banReason ?? 'Account is banned');
        }
      }

      request.user = {
        userId: user.id,
        role,
        platform,
        sessionId,
        gameProfileId: payload.gp ?? null,
      };

      // Check roles if specified
      const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(role as Role)) {
          throw new ForbiddenException('COMMON.FORBIDDEN');
        }
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('AUTH.UNAUTHORIZED');
    }

    return true;
  }

  private extractToken(request: any): string | null {
    const auth: string = request.headers?.authorization ?? '';
    if (!auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7).trim();
    return token.length > 0 ? token : null;
  }
}
