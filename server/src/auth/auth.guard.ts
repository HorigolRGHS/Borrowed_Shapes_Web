import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_SECRET', 'change-me-in-production'),
      });

      request.user = {
        userId: payload.sub,
        role: payload.role,
        platform: payload.platform,
      };
    } catch {
      throw new UnauthorizedException();
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
