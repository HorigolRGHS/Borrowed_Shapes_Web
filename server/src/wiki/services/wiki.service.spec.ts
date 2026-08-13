import { WikiService } from './wiki.service';
import { WikiPageRepository } from '../repositories/wiki-page.repository';
import { WikiRevisionRepository } from '../repositories/wiki-revision.repository';

function makePageRepo() {
  return {
    countAll: jest.fn(),
    countPublished: jest.fn(),
    findPublishedBySlug: jest.fn(),
    findByIdWithLatest: jest.fn(),
    findBySlugsMinimal: jest.fn(),
    listPaged: jest.fn().mockResolvedValue([[], 0]),
  } as unknown as jest.Mocked<WikiPageRepository>;
}

function makeRevisionRepo() {
  return {
    countAll: jest.fn(),
    countByPageIds: jest.fn().mockResolvedValue(new Map<string, number>()),
    findPageRevisionsPaged: jest.fn().mockResolvedValue([[], 0]),
    findByIdAndPage: jest.fn(),
    findPreviousBefore: jest.fn(),
  } as unknown as jest.Mocked<WikiRevisionRepository>;
}

describe('WikiService.list', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('filters isPublished=true by default', async () => {
    await service.list({ page: 1, limit: 20 }, false);
    expect(pageRepo.listPaged).toHaveBeenCalledWith(
      expect.objectContaining({ isPublished: true }),
      expect.anything(),
    );
  });

  it('omits isPublished filter when includeAll is true', async () => {
    await service.list({ page: 1, limit: 20 }, true);
    const where = pageRepo.listPaged.mock.calls[0][0];
    expect(where).not.toHaveProperty('isPublished');
  });

  it('clamps limit to max', async () => {
    await service.list({ page: 1, limit: 999 }, false);
    const opts = pageRepo.listPaged.mock.calls[0][1];
    expect(opts.limit).toBe(50);
  });

  it('clamps page to min 1', async () => {
    await service.list({ page: 0, limit: 20 }, false);
    const opts = pageRepo.listPaged.mock.calls[0][1];
    expect(opts.offset).toBe(0);
  });

  it('escapes ILIKE wildcards in q', async () => {
    await service.list({ page: 1, limit: 20, q: '50%_off' }, false);
    const where = pageRepo.listPaged.mock.calls[0][0] as any;
    const orClause = where.$or as any[];
    expect(orClause).toBeDefined();
    expect(orClause[0].title.$ilike).toContain('50\\%\\_off');
  });

  it('filters metadata category before pagination totals are calculated', async () => {
    pageRepo.listPaged.mockResolvedValueOnce([[], 21]);

    const output = await service.list(
      { page: 1, limit: 20, category: 'Character' } as any,
      false,
    );

    expect(pageRepo.listPaged).toHaveBeenCalledWith(
      expect.objectContaining({
        isPublished: true,
        metadataJson: { $contains: { category: 'Character' } },
      }),
      expect.anything(),
    );
    expect(output.total).toBe(21);
    expect(output.totalPages).toBe(2);
  });

  it.each([
    ['published', true],
    ['draft', false],
  ] as const)(
    'applies admin status=%s before pagination totals are calculated',
    async (status, isPublished) => {
      pageRepo.listPaged.mockResolvedValueOnce([[], 11]);

      const output = await service.list(
        { page: 2, limit: 10, status } as any,
        true,
      );

      expect(pageRepo.listPaged).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished }),
        expect.objectContaining({ limit: 10, offset: 10 }),
      );
      expect(output.total).toBe(11);
      expect(output.totalPages).toBe(2);
    },
  );

  it('combines admin search, category, and draft status in one pre-pagination predicate', async () => {
    pageRepo.listPaged.mockResolvedValueOnce([[], 23]);

    const output = await service.list(
      {
        page: 2,
        limit: 10,
        q: ' dragon ',
        category: 'Character',
        status: 'draft',
      } as any,
      true,
    );

    expect(pageRepo.listPaged).toHaveBeenCalledTimes(1);
    expect(pageRepo.listPaged).toHaveBeenCalledWith(
      {
        isPublished: false,
        $or: [
          { title: { $ilike: '%dragon%' } },
          { titleVi: { $ilike: '%dragon%' } },
        ],
        metadataJson: { $contains: { category: 'Character' } },
      },
      expect.objectContaining({ limit: 10, offset: 10 }),
    );
    expect(output.total).toBe(23);
    expect(output.totalPages).toBe(3);
  });

  it('keeps public lists published when status=draft is supplied', async () => {
    await service.list({ page: 1, limit: 10, status: 'draft' } as any, false);

    expect(pageRepo.listPaged).toHaveBeenCalledWith(
      expect.objectContaining({ isPublished: true }),
      expect.anything(),
    );
  });

  it('returns paginated shape', async () => {
    pageRepo.listPaged.mockResolvedValueOnce([[], 47]);
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
      const opts = pageRepo.listPaged.mock.calls[0][1];
      expect(opts.limit).toBe(1);
      expect(opts.offset).toBe(0);
    });

    it('computes large offset for page=Number.MAX_SAFE_INTEGER', async () => {
      const huge = Number.MAX_SAFE_INTEGER;
      await service.list({ page: huge, limit: 20 }, false);
      const opts = pageRepo.listPaged.mock.calls[0][1];
      expect(opts.limit).toBe(20);
      expect(opts.offset).toBe((huge - 1) * 20);
    });

    it('accepts q with exactly 500 chars (matches list contract)', async () => {
      const q = 'a'.repeat(500);
      await service.list({ page: 1, limit: 20, q }, false);
      const where = pageRepo.listPaged.mock.calls[0][0] as any;
      expect(where.$or).toBeDefined();
    });

    it('accepts q of a single char and builds %a% pattern', async () => {
      await service.list({ page: 1, limit: 20, q: 'a' }, false);
      const where = pageRepo.listPaged.mock.calls[0][0] as any;
      expect(where.$or[0].title.$ilike).toBe('%a%');
    });
  });

  describe('Abnormal', () => {
    it('escapes a literal backslash in q', async () => {
      await service.list({ page: 1, limit: 20, q: '\\' }, false);
      const where = pageRepo.listPaged.mock.calls[0][0] as any;
      // escapeLike doubles backslashes
      expect(where.$or[0].title.$ilike).toBe('%\\\\%');
    });

    it('propagates errors from pageRepo.listPaged', async () => {
      pageRepo.listPaged.mockRejectedValueOnce(new Error('db down'));
      await expect(service.list({ page: 1, limit: 20 }, false)).rejects.toThrow(
        'db down',
      );
    });
  });
});

describe('WikiService.getBySlug', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('returns 404 when slug missing', async () => {
    pageRepo.findPublishedBySlug.mockResolvedValueOnce(null);
    await expect(service.getBySlug('nope')).rejects.toThrow('wiki.not_found');
  });

  it('rejects invalid slug format', async () => {
    await expect(service.getBySlug('Invalid Slug')).rejects.toThrow(
      'wiki.invalid_slug',
    );
  });

  it('marks matched locale as en when slug matches `slug` column', async () => {
    pageRepo.findPublishedBySlug.mockResolvedValueOnce({
      id: 'p1',
      slug: 'dragon-knight',
      slugVi: 'hiep-si-rong',
      title: 'Dragon Knight',
      titleVi: 'Hiệp sĩ rồng',
      metadataJson: null,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      latestRevisionId: {
        id: 'r1',
        content: 'a',
        contentVi: 'b',
        summary: null,
        summaryVi: null,
        authorId: { id: 'u1', displayName: 'A' },
        createdAt: new Date(),
      },
    } as any);
    const out = await service.getBySlug('dragon-knight');
    expect(out.matchedSlugLocale).toBe('en');
  });

  it('marks matched locale as vi when slug matches `slugVi` column', async () => {
    pageRepo.findPublishedBySlug.mockResolvedValueOnce({
      id: 'p1',
      slug: 'dragon-knight',
      slugVi: 'hiep-si-rong',
      title: 'Dragon Knight',
      titleVi: 'Hiệp sĩ rồng',
      metadataJson: null,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      latestRevisionId: {
        id: 'r1',
        content: 'a',
        contentVi: 'b',
        summary: null,
        summaryVi: null,
        authorId: { id: 'u1', displayName: 'A' },
        createdAt: new Date(),
      },
    } as any);
    const out = await service.getBySlug('hiep-si-rong');
    expect(out.matchedSlugLocale).toBe('vi');
  });

  it('throws when latestRevisionId is null', async () => {
    pageRepo.findPublishedBySlug.mockResolvedValueOnce({
      id: 'p1',
      slug: 'a',
      slugVi: 'b',
      title: 'A',
      titleVi: 'B',
      metadataJson: null,
      isPublished: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      latestRevisionId: null,
    } as any);
    await expect(service.getBySlug('a')).rejects.toThrow('wiki.not_found');
  });

  describe('Boundary', () => {
    it('accepts a slug exactly 200 characters and queries the repo', async () => {
      const slug = 'a'.repeat(200);
      pageRepo.findPublishedBySlug.mockResolvedValueOnce({
        id: 'p1',
        slug,
        slugVi: 'vi-slug',
        title: 'T',
        titleVi: 'TV',
        metadataJson: null,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        latestRevisionId: {
          id: 'r1',
          content: 'a',
          contentVi: 'b',
          summary: null,
          summaryVi: null,
          authorId: null,
          createdAt: new Date(),
        },
      } as any);
      const out = await service.getBySlug(slug);
      expect(out.slug).toBe(slug);
      expect(pageRepo.findPublishedBySlug).toHaveBeenCalled();
    });
  });

  describe('Abnormal', () => {
    it('rejects whitespace-only slug as invalid format', async () => {
      await expect(service.getBySlug('   ')).rejects.toThrow(
        'wiki.invalid_slug',
      );
    });
  });
});

describe('WikiService.search', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('rejects q over 500 chars', async () => {
    await expect(
      service.search({ q: 'x'.repeat(501), page: 1, limit: 20 }, false),
    ).rejects.toThrow('wiki.invalid_input');
  });

  it('falls back to list when q is empty after trim', async () => {
    const out = await service.search({ q: '   ', page: 1, limit: 20 }, false);
    expect(pageRepo.listPaged).toHaveBeenCalled();
    expect(out.items).toEqual([]);
  });

  it('passes orderBy to listPaged when searching with a non-empty q', async () => {
    await service.search({ q: 'dragon', page: 1, limit: 20 }, false);
    expect(pageRepo.listPaged).toHaveBeenCalled();
    const opts = pageRepo.listPaged.mock.calls[0][1];
    expect(opts.orderBy).toBeDefined();
    // current strategy is plain updatedAt desc; if we ever reintroduce
    // relevance ordering this assertion should be updated to match.
    expect(opts.orderBy).toEqual({ updatedAt: 'desc' });
  });

  it('applies isPublished filter unless includeAll is true', async () => {
    await service.search({ q: 'dragon', page: 1, limit: 20 }, false);
    const where1 = pageRepo.listPaged.mock.calls[0][0];
    expect(where1).toMatchObject({ isPublished: true });

    pageRepo.listPaged.mockClear();
    await service.search({ q: 'dragon', page: 1, limit: 20 }, true);
    const where2 = pageRepo.listPaged.mock.calls[0][0];
    expect(where2).not.toHaveProperty('isPublished');
  });

  it('escapes ILIKE wildcards in search q', async () => {
    await service.search({ q: '50%_off', page: 1, limit: 20 }, false);
    const where = pageRepo.listPaged.mock.calls[0][0] as any;
    const orClause = where.$or as {
      title?: { $ilike: string };
      titleVi?: { $ilike: string };
    }[];
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
      expect(pageRepo.listPaged).toHaveBeenCalled();
      expect(out.items).toEqual([]);
    });
  });

  describe('Abnormal', () => {
    it('escapes SQL-injection-like input through escapeLike instead of throwing', async () => {
      await expect(
        service.search({ q: "'; DROP TABLE--", page: 1, limit: 20 }, false),
      ).resolves.toBeDefined();
      const where = pageRepo.listPaged.mock.calls[0][0] as any;
      const orClause = where.$or as { title?: { $ilike: string } }[];
      // raw input is wrapped in % … % and % / _ would be escaped (no % or _ here)
      expect(orClause[0].title?.$ilike).toBe("%'; DROP TABLE--%");
    });
  });
});

describe('WikiService.getHistory', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('throws 404 when page does not exist', async () => {
    pageRepo.findByIdWithLatest.mockResolvedValueOnce(null);
    await expect(service.getHistory('p1', 1, 20)).rejects.toThrow(
      'wiki.not_found',
    );
  });

  it('marks isLatest correctly', async () => {
    pageRepo.findByIdWithLatest.mockResolvedValueOnce({
      id: 'p1',
      latestRevisionId: { id: 'r2' },
    } as any);
    revisionRepo.findPageRevisionsPaged.mockResolvedValueOnce([
      [
        {
          id: 'r2',
          summary: null,
          summaryVi: null,
          authorId: null,
          createdAt: new Date(),
        },
        {
          id: 'r1',
          summary: null,
          summaryVi: null,
          authorId: null,
          createdAt: new Date(),
        },
      ],
      2,
    ] as any);
    const out = await service.getHistory('p1', 1, 20);
    expect(out.items[0].id).toBe('r2');
    expect(out.items[0].isLatest).toBe(true);
    expect(out.items[1].isLatest).toBe(false);
  });

  describe('Boundary', () => {
    it('returns items=[] and totalPages=1 when page has 0 revisions', async () => {
      pageRepo.findByIdWithLatest.mockResolvedValueOnce({
        id: 'p1',
        latestRevisionId: null,
      } as any);
      revisionRepo.findPageRevisionsPaged.mockResolvedValueOnce([[], 0]);
      const out = await service.getHistory('p1', 1, 20);
      expect(out.items).toEqual([]);
      expect(out.total).toBe(0);
      expect(out.totalPages).toBe(1);
    });

    it('keeps limit=50 when at the max', async () => {
      pageRepo.findByIdWithLatest.mockResolvedValueOnce({
        id: 'p1',
        latestRevisionId: null,
      } as any);
      revisionRepo.findPageRevisionsPaged.mockResolvedValueOnce([[], 0]);
      await service.getHistory('p1', 1, 50);
      const opts = revisionRepo.findPageRevisionsPaged.mock.calls[0][1];
      expect(opts.limit).toBe(50);
    });
  });
});

describe('WikiService.getRevision', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('returns 404 when revision id does not match pageId', async () => {
    revisionRepo.findByIdAndPage.mockResolvedValueOnce(null);
    await expect(service.getRevision('p1', 'r-other')).rejects.toThrow(
      'wiki.revision_not_found',
    );
  });

  describe('Abnormal', () => {
    it('throws revision_not_found when revisionId belongs to another page (findByIdAndPage returns null)', async () => {
      revisionRepo.findByIdAndPage.mockResolvedValueOnce(null);
      await expect(
        service.getRevision('p1', 'r-belongs-to-p2'),
      ).rejects.toThrow('wiki.revision_not_found');
    });
  });
});

describe('WikiService.getRevisionDiff', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('returns isFirst=true when no previous revision exists', async () => {
    revisionRepo.findByIdAndPage.mockResolvedValueOnce({
      id: 'r1',
      pageId: { id: 'p1' },
      content: 'a',
      contentVi: 'b',
      summary: null,
      summaryVi: null,
      authorId: null,
      createdAt: new Date('2026-05-01'),
    } as any);
    revisionRepo.findPreviousBefore.mockResolvedValueOnce(null);
    const out = await service.getRevisionDiff('p1', 'r1');
    expect(out.isFirst).toBe(true);
    expect(out.previous).toBeNull();
    expect(out.diff).toBeNull();
  });

  it('produces diff between current and previous', async () => {
    revisionRepo.findByIdAndPage.mockResolvedValueOnce({
      id: 'r2',
      pageId: { id: 'p1' },
      content: 'line1\nline2\nline3',
      contentVi: 'a',
      summary: null,
      summaryVi: null,
      authorId: null,
      createdAt: new Date('2026-05-02'),
    } as any);
    revisionRepo.findPreviousBefore.mockResolvedValueOnce({
      id: 'r1',
      pageId: { id: 'p1' },
      content: 'line1\nline3',
      contentVi: 'a',
      summary: null,
      summaryVi: null,
      authorId: null,
      createdAt: new Date('2026-05-01'),
    } as any);
    const out = await service.getRevisionDiff('p1', 'r2');
    expect(out.isFirst).toBe(false);
    expect(out.diff).not.toBeNull();
    expect(out.diff!.en.some((c: { type: string }) => c.type === 'add')).toBe(
      true,
    );
  });

  describe('Boundary', () => {
    it('computes diff when current content is empty (entire previous becomes "remove" chunks)', async () => {
      revisionRepo.findByIdAndPage.mockResolvedValueOnce({
        id: 'r2',
        pageId: { id: 'p1' },
        content: '',
        contentVi: '',
        summary: null,
        summaryVi: null,
        authorId: null,
        createdAt: new Date('2026-05-02'),
      } as any);
      revisionRepo.findPreviousBefore.mockResolvedValueOnce({
        id: 'r1',
        pageId: { id: 'p1' },
        content: 'line1\nline2',
        contentVi: 'a',
        summary: null,
        summaryVi: null,
        authorId: null,
        createdAt: new Date('2026-05-01'),
      } as any);
      const out = await service.getRevisionDiff('p1', 'r2');
      expect(out.isFirst).toBe(false);
      expect(out.diff).not.toBeNull();
      expect(
        out.diff!.en.some((c: { type: string }) => c.type === 'remove'),
      ).toBe(true);
    });
  });

  describe('Abnormal', () => {
    it('throws revision_not_found when target revision does not exist', async () => {
      revisionRepo.findByIdAndPage.mockResolvedValueOnce(null);
      await expect(service.getRevisionDiff('p1', 'r-missing')).rejects.toThrow(
        'wiki.revision_not_found',
      );
    });
  });
});

describe('WikiService.findBySlugs', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('returns one entry per input slug, exists flag set per match', async () => {
    pageRepo.findBySlugsMinimal.mockResolvedValue([
      {
        id: '1',
        slug: 'link',
        slugVi: 'lien-ket',
        title: 'Link',
        titleVi: 'Liên Kết',
      },
      {
        id: '2',
        slug: 'zelda',
        slugVi: 'zelda-vi',
        title: 'Zelda',
        titleVi: 'Zelda VI',
      },
    ] as any);

    const result = await service.findBySlugs(['link', 'zelda', 'ganondorf']);

    expect(result).toEqual([
      { slug: 'link', title: 'Link', titleVi: 'Liên Kết', exists: true },
      { slug: 'zelda', title: 'Zelda', titleVi: 'Zelda VI', exists: true },
      { slug: 'ganondorf', exists: false },
    ]);
  });

  it('matches input against either slug or slugVi', async () => {
    pageRepo.findBySlugsMinimal.mockResolvedValue([
      {
        id: '1',
        slug: 'link',
        slugVi: 'lien-ket',
        title: 'Link',
        titleVi: 'Liên Kết',
      },
    ] as any);

    const result = await service.findBySlugs(['lien-ket']);

    expect(result).toEqual([
      { slug: 'lien-ket', title: 'Link', titleVi: 'Liên Kết', exists: true },
    ]);
  });

  it('returns empty array on empty input', async () => {
    const result = await service.findBySlugs([]);

    expect(result).toEqual([]);
    expect(pageRepo.findBySlugsMinimal).not.toHaveBeenCalled();
  });
});

describe('WikiService public mappers (locale)', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  const page = () => ({
    id: 'p1',
    slug: 'dragon-knight',
    slugVi: 'hiep-si-rong',
    title: 'Dragon Knight',
    titleVi: 'Hiệp sĩ rồng',
    metadataJson: {
      category: 'Mechanic',
      tags: ['borrow'],
      tags_vi: ['mượn'],
      stats: {},
      relatedPages: [],
    },
    isPublished: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    latestRevisionId: {
      id: 'r1',
      content: 'EN body',
      contentVi: 'VI body',
      summary: 'EN summary',
      summaryVi: 'VI summary',
      authorId: { id: 'u1', displayName: 'A' },
      createdAt: new Date('2026-01-02'),
    },
  });

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    pageRepo.listPaged.mockResolvedValue([[page()] as any, 1]);
    pageRepo.findPublishedBySlug.mockResolvedValue(page() as any);
    pageRepo.findByIdWithLatest.mockResolvedValue(page() as any);
    revisionRepo.countByPageIds.mockResolvedValue(new Map([['p1', 3]]));
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('list (en) returns flat keys, no content, no Vi', async () => {
    const out = await service.list({ page: 1, limit: 20 }, false, 'en');
    const item = out.items[0] as any;
    expect(item.title).toBe('Dragon Knight');
    expect(item.slug).toBe('dragon-knight');
    expect(item.metadataJson).toEqual({
      category: 'Mechanic',
      tags: ['borrow'],
      tags_vi: ['mượn'],
      stats: {},
      relatedPages: [],
    });
    expect(item).not.toHaveProperty('titleVi');
    expect(item).not.toHaveProperty('slugVi');
    expect(item).not.toHaveProperty('content');
    expect(item.latestRevision.summary).toBe('EN summary');
    expect(item.latestRevision).not.toHaveProperty('summaryVi');
  });

  it('list (vi) returns vi values under the same keys', async () => {
    const out = await service.list({ page: 1, limit: 20 }, false, 'vi');
    const item = out.items[0] as any;
    expect(item.title).toBe('Hiệp sĩ rồng');
    expect(item.slug).toBe('hiep-si-rong');
    expect(item.latestRevision.summary).toBe('VI summary');
  });

  it('getBySlug (en) returns flat detail with content, no Vi', async () => {
    const out = (await service.getBySlug('dragon-knight', 'en')) as any;
    expect(out.title).toBe('Dragon Knight');
    expect(out.slug).toBe('dragon-knight');
    expect(out.latestRevision.content).toBe('EN body');
    expect(out.latestRevision.summary).toBe('EN summary');
    expect(out).not.toHaveProperty('titleVi');
    expect(out.latestRevision).not.toHaveProperty('contentVi');
    expect(out.matchedSlugLocale).toBe('en');
  });

  it('getBySlug (vi) returns vi content + marks matchedSlugLocale vi when vi slug matched', async () => {
    const out = (await service.getBySlug('hiep-si-rong', 'vi')) as any;
    expect(out.title).toBe('Hiệp sĩ rồng');
    expect(out.slug).toBe('hiep-si-rong');
    expect(out.latestRevision.content).toBe('VI body');
    expect(out.matchedSlugLocale).toBe('vi');
  });

  it('getBySlug defaults to en when locale omitted', async () => {
    const out = (await service.getBySlug('dragon-knight')) as any;
    expect(out.title).toBe('Dragon Knight');
    expect(out.latestRevision.content).toBe('EN body');
  });

  it('getBySlug delegates slug lookup to the page repo', async () => {
    await service.getBySlug('hiep-si-rong', 'vi');
    expect(pageRepo.findPublishedBySlug).toHaveBeenCalledWith('hiep-si-rong');
  });

  it('search (vi) returns vi values under flat keys', async () => {
    const out = await service.search(
      { q: 'rong', page: 1, limit: 20 },
      false,
      'vi',
    );
    const item = out.items[0] as any;
    expect(item.title).toBe('Hiệp sĩ rồng');
    expect(item.slug).toBe('hiep-si-rong');
    expect(item.latestRevision.summary).toBe('VI summary');
    expect(item.metadataJson?.category).toBe('Mechanic');
    expect(item).not.toHaveProperty('titleVi');
    expect(item).not.toHaveProperty('slugVi');
  });

  it('list (admin) emits bilingual slugVi/titleVi keys', async () => {
    const out = await service.list({ page: 1, limit: 20 }, true);
    const item = out.items[0] as any;
    expect(item).toHaveProperty('slugVi', 'hiep-si-rong');
    expect(item).toHaveProperty('titleVi', 'Hiệp sĩ rồng');
    expect(item.slug).toBe('dragon-knight');
    expect(item.title).toBe('Dragon Knight');
    expect(item.metadataJson?.category).toBe('Mechanic');
  });
});

describe('WikiService.getAdminStats', () => {
  let service: WikiService;
  let pageRepo: jest.Mocked<WikiPageRepository>;
  let revisionRepo: jest.Mocked<WikiRevisionRepository>;

  beforeEach(() => {
    pageRepo = makePageRepo();
    revisionRepo = makeRevisionRepo();
    pageRepo.countAll.mockResolvedValue(10); // totalPages
    pageRepo.countPublished.mockResolvedValue(7); // published
    revisionRepo.countAll.mockResolvedValue(25); // totalRevisions
    service = new WikiService(pageRepo, revisionRepo);
  });

  it('returns correct shape with drafts computed', async () => {
    const stats = await service.getAdminStats();
    expect(stats).toEqual({
      totalPages: 10,
      published: 7,
      drafts: 3,
      totalRevisions: 25,
    });
  });

  it('counts pages, published, and revisions via the repos', async () => {
    await service.getAdminStats();
    expect(pageRepo.countAll).toHaveBeenCalledTimes(1);
    expect(pageRepo.countPublished).toHaveBeenCalledTimes(1);
    expect(revisionRepo.countAll).toHaveBeenCalledTimes(1);
  });
});
