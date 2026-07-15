import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { DownloadLog } from '../../entities/DownloadLog';

@Injectable()
export class DownloadLogRepository extends BaseRepository<DownloadLog> {
  constructor(em: EntityManager) {
    super(em, DownloadLog);
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
