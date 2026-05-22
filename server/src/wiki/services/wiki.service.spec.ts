import { Test } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { WikiService } from './wiki.service';

describe('WikiService.list', () => {
  let service: WikiService;
  let em: { findAndCount: jest.Mock };

  beforeEach(async () => {
    em = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiService,
        { provide: EntityManager, useValue: em },
      ],
    }).compile();
    service = moduleRef.get(WikiService);
  });

  it('filters isPublished=true by default', async () => {
    await service.list({ page: 1, limit: 20 }, false);
    expect(em.findAndCount).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isPublished: true }),
      expect.anything(),
    );
  });

  it('omits isPublished filter when includeAll is true', async () => {
    await service.list({ page: 1, limit: 20 }, true);
    const where = em.findAndCount.mock.calls[0][1];
    expect(where).not.toHaveProperty('isPublished');
  });

  it('clamps limit to max', async () => {
    await service.list({ page: 1, limit: 999 }, false);
    const opts = em.findAndCount.mock.calls[0][2];
    expect(opts.limit).toBe(50);
  });

  it('clamps page to min 1', async () => {
    await service.list({ page: 0, limit: 20 }, false);
    const opts = em.findAndCount.mock.calls[0][2];
    expect(opts.offset).toBe(0);
  });

  it('escapes ILIKE wildcards in q', async () => {
    await service.list({ page: 1, limit: 20, q: '50%_off' }, false);
    const where = em.findAndCount.mock.calls[0][1];
    const orClause = where.$or as any[];
    expect(orClause).toBeDefined();
    expect(orClause[0].title.$ilike).toContain('50\\%\\_off');
  });

  it('returns paginated shape', async () => {
    em.findAndCount.mockResolvedValueOnce([[], 47]);
    const out = await service.list({ page: 2, limit: 20 }, false);
    expect(out).toMatchObject({
      total: 47,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });
});

describe('WikiService.getBySlug', () => {
  let service: WikiService;
  let em: { findOne: jest.Mock };

  beforeEach(async () => {
    em = { findOne: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiService,
        { provide: EntityManager, useValue: em },
      ],
    }).compile();
    service = moduleRef.get(WikiService);
  });

  it('returns 404 when slug missing', async () => {
    em.findOne.mockResolvedValueOnce(null);
    await expect(service.getBySlug('nope')).rejects.toThrow('wiki.not_found');
  });

  it('rejects invalid slug format', async () => {
    await expect(service.getBySlug('Invalid Slug')).rejects.toThrow('wiki.invalid_slug');
  });

  it('marks matched locale as en when slug matches `slug` column', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      slug: 'dragon-knight',
      slug_vi: 'hiep-si-rong',
      title: 'Dragon Knight',
      title_vi: 'Hiệp sĩ rồng',
      metadataJson: null,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      latestRevisionId: {
        id: 'r1',
        content: 'a',
        content_vi: 'b',
        summary: null,
        summary_vi: null,
        authorId: { id: 'u1', displayName: 'A' },
        createdAt: new Date(),
      },
    });
    const out = await service.getBySlug('dragon-knight');
    expect(out.matchedSlugLocale).toBe('en');
  });

  it('marks matched locale as vi when slug matches `slug_vi` column', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      slug: 'dragon-knight',
      slug_vi: 'hiep-si-rong',
      title: 'Dragon Knight',
      title_vi: 'Hiệp sĩ rồng',
      metadataJson: null,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      latestRevisionId: {
        id: 'r1',
        content: 'a',
        content_vi: 'b',
        summary: null,
        summary_vi: null,
        authorId: { id: 'u1', displayName: 'A' },
        createdAt: new Date(),
      },
    });
    const out = await service.getBySlug('hiep-si-rong');
    expect(out.matchedSlugLocale).toBe('vi');
  });

  it('throws when latestRevisionId is null', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1', slug: 'a', slug_vi: 'b', title: 'A', title_vi: 'B',
      metadataJson: null, isPublished: true,
      createdAt: new Date(), updatedAt: new Date(),
      latestRevisionId: null,
    });
    await expect(service.getBySlug('a')).rejects.toThrow('wiki.not_found');
  });
});
