import { Test, TestingModule } from '@nestjs/testing';
import { AnnouncementService } from './announcements.service';
import { Announcement } from '../entities/Announcement';
import { AnnouncementType } from '../entities/AnnouncementType';
import { User } from '../entities/User';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AnnouncementRepository } from './repositories/announcements.repository';
import { AuditService } from '../audit/audit.service';

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let repository: AnnouncementRepository;
  let mockAuditService: any;

  beforeEach(async () => {
    mockAuditService = {
      recordInCurrentUnitOfWork: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        {
          provide: AnnouncementRepository,
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            persistAndFlush: jest.fn(),
            assign: jest.fn(),
            flush: jest.fn(),
            removeAndFlush: jest.fn(),
            getUserReference: jest.fn(),
            findPublicAnnouncements: jest.fn(),
            findAdminAnnouncements: jest.fn(),
            checkSlugUniqueness: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);
    repository = module.get<AnnouncementRepository>(AnnouncementRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllPublic', () => {
    const mockAuthor = { id: 'u1', displayName: 'Admin' } as User;
    const mockAnnouncement = {
      id: 'a1',
      slug: 'test-slug',
      slugVi: 'vi-test-slug',
      title: 'Title',
      titleVi: 'Title VI',
      summary: 'Summary EN',
      summaryVi: 'Summary VI',
      content: 'Content',
      contentVi: 'Content VI',
      type: AnnouncementType.NEWS,
      isPinned: false,
      isPublished: true,
      publishedAt: new Date(Date.now() - 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: mockAuthor,
    } as unknown as Announcement;

    it('should return public list with English fields when lang is en (Normal)', async () => {
      jest
        .spyOn(repository, 'findPublicAnnouncements')
        .mockResolvedValue([[mockAnnouncement], 1]);

      const result = await service.findAllPublic({ page: 1, limit: 10 }, 'en');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].slug).toBe('test-slug');
      expect(result.items[0].title).toBe('Title');
      expect(result.items[0].summary).toBe('Summary EN');
      expect(result.items[0].author?.id).toBe('u1');
      // Public list should NOT have content
      expect((result.items[0] as any).content).toBeUndefined();
      // Public list should NOT have id
      expect((result.items[0] as any).id).toBeUndefined();
      expect(repository.findPublicAnnouncements).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        }),
      );
    });

    it('should return public list with Vietnamese fields when lang is vi (Normal)', async () => {
      jest
        .spyOn(repository, 'findPublicAnnouncements')
        .mockResolvedValue([[mockAnnouncement], 1]);

      const result = await service.findAllPublic({ page: 1, limit: 10 }, 'vi');

      expect(result.items[0].slug).toBe('vi-test-slug');
      expect(result.items[0].title).toBe('Title VI');
      expect(result.items[0].summary).toBe('Summary VI');
    });

    it('should clamp invalid negative pagination queries to valid bounds (Boundary)', async () => {
      jest
        .spyOn(repository, 'findPublicAnnouncements')
        .mockResolvedValue([[mockAnnouncement], 1]);

      const result = await service.findAllPublic(
        { page: -5, limit: -10 },
        'en',
      );

      expect(result.page).toBe(1);
      expect(result.limit).toBe(1); // negative limit clamped to min=1
      expect(repository.findPublicAnnouncements).toHaveBeenCalledWith(
        expect.objectContaining({
          page: -5,
          limit: -10,
        }),
      );
    });

    it('should clamp extremely large limit query to maximum allowed limit (Boundary)', async () => {
      jest
        .spyOn(repository, 'findPublicAnnouncements')
        .mockResolvedValue([[mockAnnouncement], 1]);

      const result = await service.findAllPublic({ limit: 100 }, 'en');

      expect(result.limit).toBe(50); // limit 100 clamped to max=50
      expect(repository.findPublicAnnouncements).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100,
        }),
      );
    });
  });

  describe('findAllAdmin', () => {
    const mockAuthor = { id: 'u1', displayName: 'Admin' } as User;
    const mockAnnouncement = {
      id: 'a1',
      slug: 'test-slug',
      slugVi: 'vi-test-slug',
      title: 'Title',
      titleVi: 'Title VI',
      summary: 'Summary EN',
      summaryVi: 'Summary VI',
      content: 'Content',
      contentVi: 'Content VI',
      type: AnnouncementType.NEWS,
      isPinned: false,
      isPublished: true,
      publishedAt: new Date(Date.now() - 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: mockAuthor,
    } as unknown as Announcement;

    it('should return admin list with both languages and no content (Normal)', async () => {
      jest
        .spyOn(repository, 'findAdminAnnouncements')
        .mockResolvedValue([[mockAnnouncement], 1]);

      const result = await service.findAllAdmin({ page: 1, limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('a1');
      expect(result.items[0].title).toBe('Title');
      expect(result.items[0].titleVi).toBe('Title VI');
      expect(result.items[0].slug).toBe('test-slug');
      expect(result.items[0].slugVi).toBe('vi-test-slug');
      // Admin list should NOT have content
      expect((result.items[0] as any).content).toBeUndefined();
      expect((result.items[0] as any).contentVi).toBeUndefined();
    });

    it('should allow admin to query non-published/scheduled items (Normal)', async () => {
      jest.spyOn(repository, 'findAdminAnnouncements').mockResolvedValue([[], 0]);

      await service.findAllAdmin({ page: 1, limit: 10 });

      expect(repository.findAdminAnnouncements).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 10,
        }),
      );
    });
  });

  describe('findOnePublic', () => {
    const mockAuthor = { id: 'u1', displayName: 'Admin' } as User;
    const mockAnnouncement = {
      id: 'a1',
      slug: 'test-slug',
      slugVi: 'vi-test-slug',
      title: 'Title',
      titleVi: 'Title VI',
      summary: 'Summary EN',
      summaryVi: 'Summary VI',
      content: 'Content',
      contentVi: 'Content VI',
      type: AnnouncementType.NEWS,
      isPinned: false,
      isPublished: true,
      publishedAt: new Date(Date.now() - 10000),
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: mockAuthor,
    } as unknown as Announcement;

    it('should return public detail with English content by slug (Normal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockAnnouncement);

      const result = await service.findOnePublic('test-slug', 'en');

      expect(result.slug).toBe('test-slug');
      expect(result.title).toBe('Title');
      expect(result.content).toBe('Content');
      // Public detail should NOT have id
      expect((result as any).id).toBeUndefined();
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [{ slug: 'test-slug' }, { slugVi: 'test-slug' }],
        }),
        expect.any(Object),
      );
    });

    it('should return public detail with Vietnamese content when lang is vi (Normal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockAnnouncement);

      const result = await service.findOnePublic('vi-test-slug', 'vi');

      expect(result.slug).toBe('vi-test-slug');
      expect(result.title).toBe('Title VI');
      expect(result.content).toBe('Content VI');
    });

    it('should throw NotFoundException if announcement does not exist (Abnormal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOnePublic('missing-slug', 'en')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if public tries to view draft/scheduled announcement (Boundary)', async () => {
      const draftAnnouncement = {
        ...mockAnnouncement,
        isPublished: false,
      } as unknown as Announcement;
      jest.spyOn(repository, 'findOne').mockResolvedValue(draftAnnouncement);

      await expect(service.findOnePublic('test-slug', 'en')).rejects.toThrow(
        NotFoundException,
      );

      const futureDate = new Date(Date.now() + 100000);
      const scheduledAnnouncement = {
        ...mockAnnouncement,
        isPublished: true,
        publishedAt: futureDate,
      } as unknown as Announcement;
      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(scheduledAnnouncement);

      await expect(service.findOnePublic('test-slug', 'en')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneAdmin', () => {
    const mockAuthor = { id: 'u1', displayName: 'Admin' } as User;
    const mockAnnouncement = {
      id: 'a1',
      slug: 'test-slug',
      slugVi: 'vi-test-slug',
      title: 'Title',
      titleVi: 'Title VI',
      summary: 'Summary EN',
      summaryVi: 'Summary VI',
      content: 'Content',
      contentVi: 'Content VI',
      type: AnnouncementType.NEWS,
      isPinned: false,
      isPublished: false,
      publishedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      authorId: mockAuthor,
    } as unknown as Announcement;

    it('should return full admin detail with all fields by id (Normal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockAnnouncement);

      const result = await service.findOneAdmin('a1');

      expect(result.id).toBe('a1');
      expect(result.title).toBe('Title');
      expect(result.titleVi).toBe('Title VI');
      expect(result.content).toBe('Content');
      expect(result.contentVi).toBe('Content VI');
      expect(result.slug).toBe('test-slug');
      expect(result.slugVi).toBe('vi-test-slug');
      expect(repository.findOne).toHaveBeenCalledWith(
        { id: 'a1' },
        expect.any(Object),
      );
    });

    it('should throw NotFoundException if announcement does not exist (Abnormal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.findOneAdmin('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow admin to view draft/scheduled announcement (Boundary)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockAnnouncement);

      const result = await service.findOneAdmin('a1');
      expect(result.id).toBe('a1');
      expect(result.isPublished).toBe(false);
    });
  });

  describe('create', () => {
    const dto = {
      title: 'New Ann',
      titleVi: 'New Ann VI',
      slug: 'new-ann',
      slugVi: 'new-ann-vi',
      content: 'Content text',
      contentVi: 'Content text VI',
      isPublished: true,
    };

    it('should create and return null (Normal)', async () => {
      jest.spyOn(repository, 'checkSlugUniqueness').mockResolvedValue(null);
      const createdEntity = {
        ...dto,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        authorId: { id: 'u1', displayName: 'Admin' } as User,
      } as unknown as Announcement;

      jest.spyOn(repository, 'create').mockReturnValue(createdEntity);
      jest.spyOn(repository, 'persistAndFlush').mockResolvedValue();

      const result = await service.create(dto, 'u1');

      expect(result).toBeNull();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'new-ann',
          publishedAt: expect.any(Date),
        }),
      );
    });

    it('should throw BadRequestException if slug is already taken (Abnormal)', async () => {
      jest
        .spyOn(repository, 'checkSlugUniqueness')
        .mockResolvedValue({ id: 'existing' } as Announcement);

      await expect(service.create(dto, 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should fallback to current date for publishedAt if isPublished is true but publishedAt is omitted and return null (Boundary)', async () => {
      jest.spyOn(repository, 'checkSlugUniqueness').mockResolvedValue(null);
      const createdEntity = {
        ...dto,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Announcement;

      jest.spyOn(repository, 'create').mockReturnValue(createdEntity);
      jest.spyOn(repository, 'persistAndFlush').mockResolvedValue();

      const result = await service.create(
        { ...dto, publishedAt: undefined },
        'u1',
      );

      expect(result).toBeNull();
      expect(repository.create).toHaveBeenCalledWith(
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
      slugVi: 'vi-old-slug',
      title: 'Old Title',
      titleVi: 'Old Title VI',
      content: 'Old Content',
      contentVi: 'Old Content VI',
      isPublished: false,
      publishedAt: undefined,
    } as unknown as Announcement;

    it('should assign, update properties on existing announcement, and return null (Normal)', async () => {
      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(existingAnn) // for checking existence
        .mockResolvedValueOnce(null); // for checking slug collision

      jest
        .spyOn(repository, 'assign')
        .mockImplementation((entity: any, update: any) => {
          Object.assign(entity, update);
          return entity;
        });
      jest.spyOn(repository, 'flush').mockResolvedValue();

      const result = await service.update('a1', {
        title: 'Updated Title',
        isPublished: true,
      });

      expect(result).toBeNull();
      expect(repository.flush).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent announcement (Abnormal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if update targets a slug collision (Boundary)', async () => {
      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(existingAnn); // first lookup
      jest
        .spyOn(repository, 'checkSlugUniqueness')
        .mockResolvedValueOnce({ id: 'other' } as Announcement); // collision check

      await expect(
        service.update('a1', { slug: 'other-slug' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should remove and flush database changes (Normal)', async () => {
      const mockEntity = { id: 'a1' } as Announcement;
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockEntity);
      jest.spyOn(repository, 'removeAndFlush').mockResolvedValue();

      await service.delete('a1');

      expect(repository.removeAndFlush).toHaveBeenCalledWith(mockEntity);
    });

    it('should throw NotFoundException if deleting non-existent announcement (Abnormal)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
