import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { DownloadStats } from '../../entities/DownloadStats';

@Injectable()
export class DownloadStatsRepository extends BaseRepository<DownloadStats> {
  constructor(em: EntityManager) {
    super(em, DownloadStats);
  }

  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }
  async persist(entity: any): void {
    this.getEntityManager().persist(entity);
  }
  async persistAndFlush(entity: any): Promise<void> {
    await this.getEntityManager().persistAndFlush(entity);
  }
}
