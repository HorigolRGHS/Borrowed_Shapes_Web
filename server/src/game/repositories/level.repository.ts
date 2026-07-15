import { BaseRepository } from '../../common/repositories/base.repository';
import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Level } from '../../entities/Level';

@Injectable()
export class LevelRepository extends BaseRepository<Level> {
  constructor(em: EntityManager) {
    super(em, Level);
  }
}
