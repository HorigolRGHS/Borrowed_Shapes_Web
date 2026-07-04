import { Injectable } from '@nestjs/common';
import { EntityManager, FilterQuery, FindOptions, FindOneOptions } from '@mikro-orm/postgresql';
import { Announcement } from '../entities/Announcement';
import { User } from '../entities/User';

@Injectable()
export class AnnouncementRepository {
  constructor(private readonly em: EntityManager) {}

  async findAndCount(
    where: FilterQuery<Announcement>,
    options?: FindOptions<Announcement, any, any>,
  ): Promise<[Announcement[], number]> {
    return this.em.findAndCount(Announcement, where, options);
  }

  async findOne(
    where: FilterQuery<Announcement>,
    options?: FindOneOptions<Announcement, any, any>,
  ): Promise<Announcement | null> {
    return this.em.findOne(Announcement, where, options);
  }

  create(data: any): Announcement {
    return this.em.create(Announcement, data);
  }

  getUserReference(id: string): User {
    return this.em.getReference(User, id);
  }

  async persistAndFlush(announcement: Announcement): Promise<void> {
    await this.em.persistAndFlush(announcement);
  }

  assign(announcement: Announcement, data: any): void {
    this.em.assign(announcement, data);
  }

  async flush(): Promise<void> {
    await this.em.flush();
  }

  async removeAndFlush(announcement: Announcement): Promise<void> {
    await this.em.removeAndFlush(announcement);
  }

  async publishScheduled(): Promise<number> {
    return this.em.nativeUpdate(
      Announcement,
      {
        isPublished: false,
        publishedAt: { $ne: null, $lte: new Date() },
      },
      {
        isPublished: true,
      },
    );
  }
}
