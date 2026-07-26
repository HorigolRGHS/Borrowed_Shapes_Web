import { Test, TestingModule } from '@nestjs/testing';
import { ForumService } from './forums.service';
import {
  ForumThreadRepository,
  ForumThreadVoteRepository,
} from './repositories/forums.repository';
import { ForumCategoryRepository } from '../categories/repositories/categories.repository';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from '../storage/r2-storage.service';
import { AuditService } from '../audit/audit.service';

describe('ForumService', () => {
  let service: ForumService;
  let mockThreadRepo: any;
  let mockCategoryRepo: any;
  let mockThreadVoteRepo: any;
  let mockStorageService: any;
  let mockConfigService: any;
  let mockAuditService: any;

  beforeEach(async () => {
    mockThreadRepo = { listThreads: jest.fn() };
    mockCategoryRepo = {};
    mockThreadVoteRepo = {};
    mockStorageService = {};
    mockConfigService = {};
    mockAuditService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumService,
        { provide: ForumThreadRepository, useValue: mockThreadRepo },
        { provide: ForumCategoryRepository, useValue: mockCategoryRepo },
        { provide: ForumThreadVoteRepository, useValue: mockThreadVoteRepo },
        { provide: R2StorageService, useValue: mockStorageService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ForumService>(ForumService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('truncates list content to a ~100 char plaintext preview', async () => {
      const longBody = '# Heading\n' + 'x'.repeat(300);
      mockThreadRepo.listThreads.mockResolvedValueOnce({
        rows: [
          {
            id: 't1',
            title: 'T',
            slug: 't',
            content: longBody,
            imageUrl: null,
            score: 0,
            viewCount: 0,
            isPinned: false,
            postType: 'GENERAL',
            status: 'OPEN',
            createdAt: new Date(),
            updatedAt: new Date(),
            authorId: 'u1',
            authorName: 'A',
            authorAvatar: null,
            authorBadgeImageUrl: null,
            categoryId: 'c1',
            categoryName: 'Cat',
            categorySlug: 'cat',
          },
        ],
        total: 1,
      });

      const out = await service.list({ page: 1, limit: 20 });
      const item = out.items[0] as any;
      expect(item.content.length).toBeLessThanOrEqual(101);
      expect(item.content.endsWith('…')).toBe(true);
      expect(item.content).not.toContain('#');
    });

    it('leaves short content intact without ellipsis', async () => {
      mockThreadRepo.listThreads.mockResolvedValueOnce({
        rows: [
          {
            id: 't1',
            title: 'T',
            slug: 't',
            content: 'short body',
            imageUrl: null,
            score: 0,
            viewCount: 0,
            isPinned: false,
            postType: 'GENERAL',
            status: 'OPEN',
            createdAt: new Date(),
            updatedAt: new Date(),
            authorId: 'u1',
            authorName: 'A',
            authorAvatar: null,
            authorBadgeImageUrl: null,
            categoryId: 'c1',
            categoryName: 'Cat',
            categorySlug: 'cat',
          },
        ],
        total: 1,
      });

      const out = await service.list({ page: 1, limit: 20 });
      expect((out.items[0] as any).content).toBe('short body');
    });
  });
});
