import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { UserOnlineStatus } from '../../entities/UserOnlineStatus';
import { User } from '../../entities/User';

@Injectable()
export class UserOnlineStatusRepository extends BaseRepository<UserOnlineStatus> {
  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }
  async persist(entity: any): void {
    this.getEntityManager().persist(entity);
  }
  async persistAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().persistAndFlush(entity);
  }

  constructor(em: EntityManager) {
    super(em, UserOnlineStatus);
  }

  async setOfflineForUsersNotIn(userIds: string[]): Promise<void> {
    await this.nativeUpdate(
      { userId: { $nin: userIds }, isOnline: true },
      { isOnline: false, onlinePlatforms: [] },
    );
  }
}
