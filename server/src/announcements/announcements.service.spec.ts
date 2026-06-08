import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { AnnouncementService } from './announcements.service';
import { Announcement } from '../entities/Announcement';
import { AnnouncementType } from '../entities/AnnouncementType';
import { User } from '../entities/User';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let em: EntityManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        {
          provide: EntityManager,
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            persistAndFlush: jest.fn(),
            assign: jest.fn(),
            flush: jest.fn(),
            removeAndFlush: jest.fn(),
            getReference: jest.fn(),
            populate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);
    em = module.get<EntityManager>(EntityManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPaginated', () => {
    const mockAuthor = { id: 'u1', displayName: 'Admin' } as User;
    const mockAnnouncement = {
      id: 'a1',
      slug: 'test-slug',
      slug_vi: 'vi-test-slug',
      title: 'Title',
      title_vi: 'Title VI',
      content: 'Content',
      content_vi: 'Content VI',
      type: AnnouncementType.NEWS,
      isPinned: false,
      isPublished: true,
      publishedAt: new Date(Date.now() - 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: mockAuthor,
    } as unknown as Announcement;

    it('should retrieve list for public view containing only published items (Normal)', async () => {
      jest.spyOn(em, 'findAndCount').mockResolvedValue([[mockAnnouncement], 1]);

      const result = await service.findAllPaginated({ page: 1, limit: 10 }, false);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].slug).toBe('test-slug');
      expect(result.items[0].author?.id).toBe('u1');
      expect(em.findAndCount).toHaveBeenCalledWith(
        Announcement,
        expect.objectContaining({
          isPublished: true,
          publishedAt: expect.any(Object), // $lte check
        }),
        expect.any(Object),
      );
    });

    it('should clamp invalid negative pagination queries to valid bounds (Boundary)', async () => {
      jest.spyOn(em, 'findAndCount').mockResolvedValue([[mockAnnouncement], 1]);

      const result = await service.findAllPaginated({ page: -5, limit: -10 }, false);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(1); // negative limit clamped to min=1
      expect(em.findAndCount).toHaveBeenCalledWith(
        Announcement,
        expect.any(Object),
        expect.objectContaining({
          limit: 1,
          offset: 0,
        }),
      );
    });

    it('should clamp extremely large limit query to maximum allowed limit (Boundary)', async () => {
      jest.spyOn(em, 'findAndCount').mockResolvedValue([[mockAnnouncement], 1]);

      const result = await service.findAllPaginated({ limit: 100 }, false);

      expect(result.limit).toBe(50); // limit 100 clamped to max=50
      expect(em.findAndCount).toHaveBeenCalledWith(
        Announcement,
        expect.any(Object),
        expect.objectContaining({
          limit: 50,
        }),
      );
    });

    it('should allow admin to query non-published/scheduled items (Normal)', async () => {
      jest.spyOn(em, 'findAndCount').mockResolvedValue([[], 0]);

      await service.findAllPaginated({ page: 1, limit: 10 }, true);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Announcement,
        expect.not.objectContaining({
          isPublished: true,
        }),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    const mockAuthor = { id: 'u1', displayName: 'Admin' } as User;
    const mockAnnouncement = {
      id: 'a1',
      slug: 'test-slug',
      slug_vi: 'vi-test-slug',
      title: 'Title',
      title_vi: 'Title VI',
      content: 'Content',
      content_vi: 'Content VI',
      type: AnnouncementType.NEWS,
      isPinned: false,
      isPublished: true,
      publishedAt: new Date(Date.now() - 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: mockAuthor,
    } as unknown as Announcement;

    it('should return announcement detail for public view if published (Normal)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue(mockAnnouncement);

      const result = await service.findOne('test-slug', false);

      expect(result.slug).toBe('test-slug');
      expect(em.findOne).toHaveBeenCalledWith(
        Announcement,
        expect.objectContaining({
          $or: expect.arrayContaining([
            { id: 'test-slug' },
            { slug: 'test-slug' },
            { slug_vi: 'test-slug' },
          ]),
        }),
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if announcement does not exist (Abnormal)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('missing-slug', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if public tries to view draft/scheduled announcement (Boundary)', async () => {
      const draftAnnouncement = { ...mockAnnouncement, isPublished: false } as unknown as Announcement;
      jest.spyOn(em, 'findOne').mockResolvedValue(draftAnnouncement);

      await expect(service.findOne('test-slug', false)).rejects.toThrow(
        NotFoundException,
      );

      const futureDate = new Date(Date.now() + 100000);
      const scheduledAnnouncement = { ...mockAnnouncement, isPublished: true, publishedAt: futureDate } as unknown as Announcement;
      jest.spyOn(em, 'findOne').mockResolvedValue(scheduledAnnouncement);

      await expect(service.findOne('test-slug', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow admin to view draft/scheduled announcement (Normal)', async () => {
      const draftAnnouncement = { ...mockAnnouncement, isPublished: false } as unknown as Announcement;
      jest.spyOn(em, 'findOne').mockResolvedValue(draftAnnouncement);

      const result = await service.findOne('test-slug', true);
      expect(result.id).toBe('a1');
    });
  });

  describe('create', () => {
    const dto = {
      title: 'New Ann',
      title_vi: 'New Ann VI',
      slug: 'new-ann',
      slug_vi: 'new-ann-vi',
      content: 'Content text',
      content_vi: 'Content text VI',
      isPublished: true,
    };

    it('should create and return the new announcement (Normal)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue(null);
      const createdEntity = {
        ...dto,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: { id: 'u1', displayName: 'Admin' } as User,
      } as unknown as Announcement;

      jest.spyOn(em, 'create').mockReturnValue(createdEntity);
      jest.spyOn(em, 'persistAndFlush').mockResolvedValue();
      jest.spyOn(em, 'populate').mockResolvedValue(createdEntity as any);

      const result = await service.create(dto, 'u1');

      expect(result.id).toBe('new-id');
      expect(em.create).toHaveBeenCalledWith(
        Announcement,
        expect.objectContaining({
          slug: 'new-ann',
          publishedAt: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException if slug is already taken (Abnormal)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue({ id: 'existing' } as Announcement);

      await expect(service.create(dto, 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should fallback to current date for publishedAt if isPublished is true but publishedAt is omitted (Boundary)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue(null);
      const createdEntity = {
        ...dto,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Announcement;

      jest.spyOn(em, 'create').mockReturnValue(createdEntity);
      jest.spyOn(em, 'persistAndFlush').mockResolvedValue();

      await service.create({ ...dto, publishedAt: undefined }, 'u1');

      expect(em.create).toHaveBeenCalledWith(
        Announcement,
        expect.objectContaining({
          publishedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('update', () => {
    const existingAnn = {
      id: 'a1',
      slug: 'old-slug',
      slug_vi: 'vi-old-slug',
      title: 'Old Title',
      title_vi: 'Old Title VI',
      content: 'Old Content',
      content_vi: 'Old Content VI',
      isPublished: false,
      publishedAt: undefined,
    } as unknown as Announcement;

    it('should assign and update properties on existing announcement (Normal)', async () => {
      jest.spyOn(em, 'findOne')
        .mockResolvedValueOnce(existingAnn) // for checking existence
        .mockResolvedValueOnce(null); // for checking slug collision

      jest.spyOn(em, 'assign').mockImplementation((entity: any, update: any) => {
        Object.assign(entity, update);
        return entity;
      });
      jest.spyOn(em, 'flush').mockResolvedValue();

      const result = await service.update('a1', { title: 'Updated Title', isPublished: true });

      expect(result.title).toBe('Updated Title');
      expect(result.isPublished).toBe(true);
      expect(result.publishedAt).toBeDefined(); // defaults to now
      expect(em.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent announcement (Abnormal)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.update('missing', { title: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if update targets a slug collision (Boundary)', async () => {
      jest.spyOn(em, 'findOne')
        .mockResolvedValueOnce(existingAnn) // first lookup
        .mockResolvedValueOnce({ id: 'other' } as Announcement); // collision check

      await expect(service.update('a1', { slug: 'other-slug' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should remove and flush database changes (Normal)', async () => {
      const mockEntity = { id: 'a1' } as Announcement;
      jest.spyOn(em, 'findOne').mockResolvedValue(mockEntity);
      jest.spyOn(em, 'removeAndFlush').mockResolvedValue();

      await service.delete('a1');

      expect(em.removeAndFlush).toHaveBeenCalledWith(mockEntity);
    });

    it('should throw NotFoundException if deleting non-existent announcement (Abnormal)', async () => {
      jest.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
