import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { FileAsset } from '../../entities/FileAsset';

@Injectable()
export class WikiAssetRepository extends BaseRepository<FileAsset> {
  constructor(em: EntityManager) {
    super(em, FileAsset);
  }

  async insertAsset(data: {
    fileName: string;
    fileVersion: string;
    filePath: string;
    fileSize: bigint;
    mimeType: string;
  }): Promise<FileAsset> {
    const asset = this.create(data as any);
    await this.getEntityManager().flush();
    return asset;
  }
}
