import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { GameRun } from '../entities/GameRun';

@Injectable()
export class GameResultRepository {
  constructor(private readonly em: EntityManager) {}

  async execute(sql: string, params?: any[]): Promise<any> {
    return this.em.execute(sql, params);
  }

  async findOne(id: string): Promise<GameRun | null> {
    return this.em.findOne(GameRun, { id });
  }

  async removeAndFlush(run: GameRun): Promise<void> {
    await this.em.removeAndFlush(run);
  }
}
