import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { RateLimitLog } from '../../entities/RateLimitLog';

@Injectable()
export class RateLimitLogRepository extends BaseRepository<RateLimitLog> {
  constructor(em: EntityManager) {
    super(em, RateLimitLog);
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }

  async persist(entity: any): Promise<void> {
    this.getEntityManager().persist(entity);
  }

  async persistAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().persistAndFlush(entity);
  }
}
