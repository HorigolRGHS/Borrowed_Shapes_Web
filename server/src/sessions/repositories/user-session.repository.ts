import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { UserSession } from '../../entities/UserSession';
import { SessionStatus } from '../../entities/SessionStatus';

@Injectable()
export class UserSessionRepository extends BaseRepository<UserSession> {
  constructor(em: EntityManager) {
    super(em, UserSession);
  }

  async findSessionsByUserId(userId: string): Promise<UserSession[]> {
    return this.find({ userId }, { orderBy: { loginTime: 'desc' } });
  }

  async findActiveSessionById(sessionId: string): Promise<UserSession | null> {
    return this.findOne({ sessionId, status: SessionStatus.ACTIVE });
  }

  async revokeSessionById(id: string): Promise<void> {
    await this.nativeUpdate(
      { id },
      { status: SessionStatus.REVOKED, logoutTime: new Date() },
    );
  }

  async replaceSessionId(
    oldSessionId: string,
    newSessionId: string,
  ): Promise<void> {
    await this.nativeUpdate(
      { sessionId: oldSessionId, status: SessionStatus.ACTIVE },
      { sessionId: newSessionId },
    );
  }
}
