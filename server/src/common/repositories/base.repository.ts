import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';

export abstract class BaseRepository<
  T extends object,
> extends EntityRepository<T> {
  // Common non-transactional methods
  async flush(): Promise<void> {
    await this.getEntityManager().flush();
  }

  persist(entity: T | T[]): void {
    this.getEntityManager().persist(entity);
  }

  async persistAndFlush(entity: T | T[]): Promise<void> {
    await this.getEntityManager().persistAndFlush(entity);
  }

  async nativeUpdate(where: any, data: any): Promise<number> {
    return this.getEntityManager().nativeUpdate(this.entityName, where, data);
  }

  // Transaction-aware methods
  txCreate(em: EntityManager, data: any): T {
    return em.create(this.entityName, data);
  }

  async txFindOne(
    em: EntityManager,
    where: any,
    options?: any,
  ): Promise<T | null> {
    return em.findOne(this.entityName, where, options) as Promise<T | null>;
  }

  async txFindOneOrFail(
    em: EntityManager,
    where: any,
    options?: any,
  ): Promise<T> {
    return em.findOneOrFail(this.entityName, where, options) as Promise<T>;
  }

  async txFind(em: EntityManager, where: any, options?: any): Promise<T[]> {
    return em.find(this.entityName, where, options) as Promise<T[]>;
  }

  txPersist(em: EntityManager, entity: any): void {
    em.persist(entity);
  }

  async txPersistAndFlush(em: EntityManager, entity: any): Promise<void> {
    await em.persistAndFlush(entity);
  }

  async txNativeUpdate(
    em: EntityManager,
    where: any,
    data: any,
  ): Promise<number> {
    return em.nativeUpdate(this.entityName, where, data);
  }

  async txFlush(em: EntityManager): Promise<void> {
    await em.flush();
  }

  async executeRaw(sql: string, params: any[] = []): Promise<any> {
    return this.getEntityManager().getConnection().execute(sql, params);
  }

  getKnex() {
    return this.getEntityManager().getConnection().getKnex();
  }
}
