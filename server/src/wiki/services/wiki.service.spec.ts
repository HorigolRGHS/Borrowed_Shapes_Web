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

  describe('Boundary', () => {
    it('handles page=1, limit=1 with offset=0', async () => {
      await service.list({ page: 1, limit: 1 }, false);
      const opts = em.findAndCount.mock.calls[0][2];
      expect(opts.limit).toBe(1);
      expect(opts.offset).toBe(0);
    });

    it('computes large offset for page=Number.MAX_SAFE_INTEGER', async () => {
      const huge = Number.MAX_SAFE_INTEGER;
      await service.list({ page: huge, limit: 20 }, false);
      const opts = em.findAndCount.mock.calls[0][2];
      expect(opts.limit).toBe(20);
      expect(opts.offset).toBe((huge - 1) * 20);
    });

    it('accepts q with exactly 500 chars (matches list contract)', async () => {
      const q = 'a'.repeat(500);
      await service.list({ page: 1, limit: 20, q }, false);
      const where = em.findAndCount.mock.calls[0][1];
      expect(where.$or).toBeDefined();
    });

    it('accepts q of a single char and builds %a% pattern', async () => {
      await service.list({ page: 1, limit: 20, q: 'a' }, false);
      const where = em.findAndCount.mock.calls[0][1];
      expect(where.$or[0].title.$ilike).toBe('%a%');
    });
  });

  describe('Abnormal', () => {
    it('escapes a literal backslash in q', async () => {
      await service.list({ page: 1, limit: 20, q: '\\' }, false);
      const where = em.findAndCount.mock.calls[0][1];
      // escapeLike doubles backslashes
      expect(where.$or[0].title.$ilike).toBe('%\\\\%');
    });

    it('propagates errors from em.findAndCount', async () => {
      em.findAndCount.mockRejectedValueOnce(new Error('db down'));
      await expect(service.list({ page: 1, limit: 20 }, false)).rejects.toThrow('db down');
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

  describe('Boundary', () => {
    it('accepts a slug exactly 200 characters and queries findOne', async () => {
      const slug = 'a'.repeat(200);
      em.findOne.mockResolvedValueOnce({
        id: 'p1',
        slug, slug_vi: 'vi-slug',
        title: 'T', title_vi: 'TV',
        metadataJson: null, isPublished: true,
        createdAt: new Date(), updatedAt: new Date(),
        latestRevisionId: {
          id: 'r1', content: 'a', content_vi: 'b',
          summary: null, summary_vi: null,
          authorId: null, createdAt: new Date(),
        },
      });
      const out = await service.getBySlug(slug);
      expect(out.slug).toBe(slug);
      expect(em.findOne).toHaveBeenCalled();
    });
  });

  describe('Abnormal', () => {
    it('rejects whitespace-only slug as invalid format', async () => {
      await expect(service.getBySlug('   ')).rejects.toThrow('wiki.invalid_slug');
    });
  });
});

describe('WikiService.search', () => {
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

  it('rejects q over 500 chars', async () => {
    await expect(
      service.search({ q: 'x'.repeat(501), page: 1, limit: 20 }, false),
    ).rejects.toThrow('wiki.invalid_input');
  });

  it('falls back to list when q is empty after trim', async () => {
    const out = await service.search({ q: '   ', page: 1, limit: 20 }, false);
    expect(em.findAndCount).toHaveBeenCalled();
    expect(out.items).toEqual([]);
  });

  it('passes orderBy to findAndCount when searching with a non-empty q', async () => {
    await service.search({ q: 'dragon', page: 1, limit: 20 }, false);
    expect(em.findAndCount).toHaveBeenCalled();
    const call = em.findAndCount.mock.calls[0];
    const opts = call[2];
    expect(opts.orderBy).toBeDefined();
    // current strategy is plain updatedAt desc; if we ever reintroduce
    // relevance ordering this assertion should be updated to match.
    expect(opts.orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('applies isPublished filter unless includeAll is true', async () => {
    await service.search({ q: 'dragon', page: 1, limit: 20 }, false);
    const where1 = em.findAndCount.mock.calls[0][1];
    expect(where1).toMatchObject({ isPublished: true });

    em.findAndCount.mockClear();
    await service.search({ q: 'dragon', page: 1, limit: 20 }, true);
    const where2 = em.findAndCount.mock.calls[0][1];
    expect(where2).not.toHaveProperty('isPublished');
  });

  it('escapes ILIKE wildcards in search q', async () => {
    await service.search({ q: '50%_off', page: 1, limit: 20 }, false);
    const where = em.findAndCount.mock.calls[0][1];
    const orClause = where.$or as { title?: { $ilike: string }; title_vi?: { $ilike: string } }[];
    expect(orClause).toBeDefined();
    expect(orClause[0].title?.$ilike).toContain('50\\%\\_off');
  });

  describe('Boundary', () => {
    it('accepts q exactly at max length (500 chars) — does not reject', async () => {
      await expect(
        service.search({ q: 'a'.repeat(500), page: 1, limit: 20 }, false),
      ).resolves.toBeDefined();
    });

    it('rejects q at 501 chars', async () => {
      await expect(
        service.search({ q: 'a'.repeat(501), page: 1, limit: 20 }, false),
      ).rejects.toThrow('wiki.invalid_input');
    });

    it('falls back to list when q is whitespace-only (3 spaces)', async () => {
      const out = await service.search({ q: '   ', page: 1, limit: 20 }, false);
      expect(em.findAndCount).toHaveBeenCalled();
      expect(out.items).toEqual([]);
    });
  });

  describe('Abnormal', () => {
    it('escapes SQL-injection-like input through escapeLike instead of throwing', async () => {
      await expect(
        service.search({ q: "'; DROP TABLE--", page: 1, limit: 20 }, false),
      ).resolves.toBeDefined();
      const where = em.findAndCount.mock.calls[0][1];
      const orClause = where.$or as { title?: { $ilike: string } }[];
      // raw input is wrapped in % … % and % / _ would be escaped (no % or _ here)
      expect(orClause[0].title?.$ilike).toBe("%'; DROP TABLE--%");
    });
  });
});

describe('WikiService.getHistory', () => {
  let service: WikiService;
  let em: { findOne: jest.Mock; findAndCount: jest.Mock };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
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

  it('throws 404 when page does not exist', async () => {
    em.findOne.mockResolvedValueOnce(null);
    await expect(service.getHistory('p1', 1, 20)).rejects.toThrow('wiki.not_found');
  });

  it('marks isLatest correctly', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      latestRevisionId: { id: 'r2' },
    });
    em.findAndCount.mockResolvedValueOnce([
      [
        { id: 'r2', summary: null, summary_vi: null, authorId: null, createdAt: new Date() },
        { id: 'r1', summary: null, summary_vi: null, authorId: null, createdAt: new Date() },
      ],
      2,
    ]);
    const out = await service.getHistory('p1', 1, 20);
    expect(out.items[0].id).toBe('r2');
    expect(out.items[0].isLatest).toBe(true);
    expect(out.items[1].isLatest).toBe(false);
  });

  describe('Boundary', () => {
    it('returns items=[] and totalPages=1 when page has 0 revisions', async () => {
      em.findOne.mockResolvedValueOnce({ id: 'p1', latestRevisionId: null });
      em.findAndCount.mockResolvedValueOnce([[], 0]);
      const out = await service.getHistory('p1', 1, 20);
      expect(out.items).toEqual([]);
      expect(out.total).toBe(0);
      expect(out.totalPages).toBe(1);
    });

    it('keeps limit=50 when at the max', async () => {
      em.findOne.mockResolvedValueOnce({ id: 'p1', latestRevisionId: null });
      em.findAndCount.mockResolvedValueOnce([[], 0]);
      await service.getHistory('p1', 1, 50);
      const opts = em.findAndCount.mock.calls[0][2];
      expect(opts.limit).toBe(50);
    });
  });
});

describe('WikiService.getRevision', () => {
  let service: WikiService;
  let em: { findOne: jest.Mock; getReference: jest.Mock };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      getReference: jest.fn().mockImplementation((_e, id) => ({ id })),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiService,
        { provide: EntityManager, useValue: em },
      ],
    }).compile();
    service = moduleRef.get(WikiService);
  });

  it('returns 404 when revision id does not match pageId', async () => {
    em.findOne.mockResolvedValueOnce(null);
    await expect(service.getRevision('p1', 'r-other')).rejects.toThrow('wiki.revision_not_found');
  });

  describe('Abnormal', () => {
    it('throws revision_not_found when revisionId belongs to another page (findOne returns null)', async () => {
      em.findOne.mockResolvedValueOnce(null);
      await expect(service.getRevision('p1', 'r-belongs-to-p2')).rejects.toThrow('wiki.revision_not_found');
    });
  });
});

describe('WikiService.getRevisionDiff', () => {
  let service: WikiService;
  let em: any;

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      getReference: jest.fn().mockImplementation((_e: unknown, id: string) => ({ id })),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiService,
        { provide: EntityManager, useValue: em },
      ],
    }).compile();
    service = moduleRef.get(WikiService);
  });

  it('returns isFirst=true when no previous revision exists', async () => {
    em.findOne
      .mockResolvedValueOnce({
        id: 'r1', pageId: { id: 'p1' },
        content: 'a', content_vi: 'b',
        summary: null, summary_vi: null,
        authorId: null, createdAt: new Date('2026-05-01'),
      })
      .mockResolvedValueOnce(null);
    const out = await service.getRevisionDiff('p1', 'r1');
    expect(out.isFirst).toBe(true);
    expect(out.previous).toBeNull();
    expect(out.diff).toBeNull();
  });

  it('produces diff between current and previous', async () => {
    em.findOne
      .mockResolvedValueOnce({
        id: 'r2', pageId: { id: 'p1' },
        content: 'line1\nline2\nline3', content_vi: 'a',
        summary: null, summary_vi: null,
        authorId: null, createdAt: new Date('2026-05-02'),
      })
      .mockResolvedValueOnce({
        id: 'r1', pageId: { id: 'p1' },
        content: 'line1\nline3', content_vi: 'a',
        summary: null, summary_vi: null,
        authorId: null, createdAt: new Date('2026-05-01'),
      });
    const out = await service.getRevisionDiff('p1', 'r2');
    expect(out.isFirst).toBe(false);
    expect(out.diff).not.toBeNull();
    expect(out.diff!.en.some((c: { type: string }) => c.type === 'add')).toBe(true);
  });

  describe('Boundary', () => {
    it('computes diff when current content is empty (entire previous becomes "remove" chunks)', async () => {
      em.findOne
        .mockResolvedValueOnce({
          id: 'r2', pageId: { id: 'p1' },
          content: '', content_vi: '',
          summary: null, summary_vi: null,
          authorId: null, createdAt: new Date('2026-05-02'),
        })
        .mockResolvedValueOnce({
          id: 'r1', pageId: { id: 'p1' },
          content: 'line1\nline2', content_vi: 'a',
          summary: null, summary_vi: null,
          authorId: null, createdAt: new Date('2026-05-01'),
        });
      const out = await service.getRevisionDiff('p1', 'r2');
      expect(out.isFirst).toBe(false);
      expect(out.diff).not.toBeNull();
      expect(out.diff!.en.some((c: { type: string }) => c.type === 'remove')).toBe(true);
    });
  });

  describe('Abnormal', () => {
    it('throws revision_not_found when target revision does not exist', async () => {
      em.findOne.mockResolvedValueOnce(null);
      await expect(service.getRevisionDiff('p1', 'r-missing')).rejects.toThrow('wiki.revision_not_found');
    });
  });
});
