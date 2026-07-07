import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { UserOnlineStatus } from '../../entities/UserOnlineStatus';
import { User } from '../../entities/User';

@Injectable()
export class UserOnlineStatusRepository extends EntityRepository<UserOnlineStatus> {
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
