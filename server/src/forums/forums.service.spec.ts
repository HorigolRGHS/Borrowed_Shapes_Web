import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { ForumService } from './forums.service';

describe('ForumService', () => {
  let service: ForumService;
  let em: { execute: jest.Mock };

  beforeEach(async () => {
    em = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForumService,
        { provide: EntityManager, useValue: em },
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
      (em.execute as jest.Mock)
        .mockResolvedValueOnce([
          { id: 't1', title: 'T', slug: 't', content: longBody, imageUrl: null,
            score: 0, viewCount: 0, isPinned: false, postType: 'GENERAL', status: 'OPEN',
            createdAt: new Date(), updatedAt: new Date(),
            authorId: 'u1', authorName: 'A', authorAvatar: null, authorBadgeImageUrl: null,
            categoryId: 'c1', categoryName: 'Cat', categorySlug: 'cat' },
        ])
        .mockResolvedValueOnce([{ cnt: 1 }]);

      const out = await service.list({ page: 1, limit: 20 });
      const item = out.items[0] as any;
      expect(item.content.length).toBeLessThanOrEqual(101);
      expect(item.content.endsWith('…')).toBe(true);
      expect(item.content).not.toContain('#');
    });

    it('leaves short content intact without ellipsis', async () => {
      (em.execute as jest.Mock)
        .mockResolvedValueOnce([
          { id: 't1', title: 'T', slug: 't', content: 'short body', imageUrl: null,
            score: 0, viewCount: 0, isPinned: false, postType: 'GENERAL', status: 'OPEN',
            createdAt: new Date(), updatedAt: new Date(),
            authorId: 'u1', authorName: 'A', authorAvatar: null, authorBadgeImageUrl: null,
            categoryId: 'c1', categoryName: 'Cat', categorySlug: 'cat' },
        ])
        .mockResolvedValueOnce([{ cnt: 1 }]);

      const out = await service.list({ page: 1, limit: 20 });
      expect((out.items[0] as any).content).toBe('short body');
    });
  });
});
