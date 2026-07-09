import { Injectable } from '@nestjs/common';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { Level } from '../../entities/Level';

@Injectable()
export class LevelRepository extends EntityRepository<Level> {
  constructor(em: EntityManager) {
    super(em, Level);
  }
}
