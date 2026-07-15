import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { FileAsset } from '../../entities/FileAsset';

@Injectable()
export class FileAssetRepository extends BaseRepository<FileAsset> {
  constructor(em: EntityManager) {
    super(em, FileAsset);
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

  async getActiveAsset(): Promise<FileAsset | null> {
    return this.findOne({ isActive: true });
  }

  async executeRaw(sql: string, params: any[] = []): Promise<any> {
    return this.getEntityManager().getConnection().execute(sql, params);
  }

  getKnex() {
    return this.getEntityManager().getConnection().getKnex();
  }
}
