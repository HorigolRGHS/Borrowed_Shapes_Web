import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { WikiRevisionService } from './wiki-revision.service';
import { WikiAuditService } from './wiki-audit.service';
import { WikiService } from './wiki.service';
import { WikiPageRepository } from '../repositories/wiki-page.repository';
import { WikiRevisionRepository } from '../repositories/wiki-revision.repository';
import { WikiAssetRepository } from '../repositories/wiki-asset.repository';
import { WIKI_STORAGE } from './wiki-storage.service';

function makePostgresUniqueError() {
  const err: any = new Error('duplicate key value violates unique constraint');
  err.code = '23505';
  err.constraint = 'WikiPage_slug_key';
  return err;
}

// The service now talks to repos, not the EntityManager. These thin repo mocks
// delegate straight to the existing `em` fake so every legacy `em.create` /
// `em.flush` / `em.findOne` assertion below keeps working unchanged.
function makeRepos(em: any) {
  const pageRepo = {
    runInTransaction: jest.fn((work: () => Promise<unknown>) =>
      em.transactional(work),
    ),
    createPage: jest.fn((data: any) => em.create('WikiPage', data)),
    findByIdWithLatestInTx: jest.fn((id: string) =>
      em.findOne('WikiPage', { id }),
    ),
    findByIdWithLatestAuthor: jest.fn((id: string) =>
      em.findOne('WikiPage', { id }),
    ),
    existsById: jest.fn((id: string) => em.findOne('WikiPage', { id })),
    flush: jest.fn(() => em.flush()),
    removeAndFlush: jest.fn((page: any) => em.removeAndFlush(page)),
  };
  const revisionRepo = {
    createRevision: jest.fn((data: any) =>
      em.create('WikiRevision', {
        pageId: data.page,
        authorId: em.getReference('User', data.authorId),
        content: data.content,
        contentVi: data.contentVi,
        summary: data.summary,
        summaryVi: data.summaryVi,
      }),
    ),
    findByIdAndPageInTx: jest.fn((revisionId: string, pageId: string) =>
      em.findOne('WikiRevision', { id: revisionId, pageId: { id: pageId } }),
    ),
  };
  const assetRepo = {
    insertAsset: jest.fn(async (data: any) => {
      const asset = em.create('FileAsset', data);
      await em.flush();
      return asset;
    }),
  };
  return { pageRepo, revisionRepo, assetRepo };
}

function repoProviders(em: any) {
  const { pageRepo, revisionRepo, assetRepo } = makeRepos(em);
  return [
    { provide: WikiPageRepository, useValue: pageRepo },
    { provide: WikiRevisionRepository, useValue: revisionRepo },
    { provide: WikiAssetRepository, useValue: assetRepo },
    {
      provide: WIKI_STORAGE,
      useValue: { upload: jest.fn(), delete: jest.fn() },
    },
  ];
}

describe('WikiRevisionService.create', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: {
    recordStandalone: jest.Mock;
    recordInCurrentUnitOfWork: jest.Mock;
  };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    const transactionalImpl = async (cb: any) => cb(em);
    em = {
      create: jest.fn((_entity, data) => ({
        ...data,
        id: data.id ?? 'new-id',
      })),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(transactionalImpl),
      getReference: jest.fn((_entity, id) => ({ id })),
    };
    audit = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInCurrentUnitOfWork: jest.fn(),
    };
    wikiSvc = {
      getByIdForAdmin: jest.fn().mockResolvedValue({ id: 'p1' } as any),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        ...repoProviders(em),
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('rejects invalid slug', async () => {
    await expect(
      service.create(
        {
          slug: 'Invalid Slug!',
          slugVi: 'ok-slug',
          title: 'A',
          titleVi: 'B',
          content: '',
          contentVi: '',
        } as any,
        'admin-1',
        '127.0.0.1',
      ),
    ).rejects.toThrow('wiki.invalid_slug');
  });

  it('rejects reserved slug', async () => {
    await expect(
      service.create(
        {
          slug: 'admin',
          slugVi: 'ok-vi',
          title: 'A',
          titleVi: 'B',
          content: '',
          contentVi: '',
        } as any,
        'admin-1',
        '127.0.0.1',
      ),
    ).rejects.toThrow('wiki.reserved_slug');
  });

  it('translates Postgres unique violation to ConflictException', async () => {
    em.flush.mockRejectedValueOnce(makePostgresUniqueError());
    await expect(
      service.create(
        {
          slug: 'ok-slug',
          slugVi: 'ok-vi',
          title: 'A',
          titleVi: 'B',
          content: 'a',
          contentVi: 'b',
        } as any,
        'admin-1',
        '127.0.0.1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates page, revision, and links latestRevisionId', async () => {
    await service.create(
      {
        slug: 'ok-slug',
        slugVi: 'ok-vi',
        title: 'A',
        titleVi: 'B',
        content: 'c',
        contentVi: 'd',
        summary: 's',
        summaryVi: 'sv',
        isPublished: false,
      } as any,
      'admin-1',
      '127.0.0.1',
    );
    expect(em.create).toHaveBeenCalled();
    expect(em.flush).toHaveBeenCalled();
    expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'CREATE',
        entityName: 'WikiPage',
      }),
    );
  });

  describe('Boundary', () => {
    it('creates a draft with empty content', async () => {
      await service.create(
        {
          slug: 'ok-slug',
          slugVi: 'ok-vi',
          title: 'A',
          titleVi: 'B',
          content: '',
          contentVi: '',
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      expect(em.create).toHaveBeenCalled();
      expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalled();
    });

    it('creates a page with content of 1MB', async () => {
      const big = 'a'.repeat(1_000_000);
      await service.create(
        {
          slug: 'ok-slug',
          slugVi: 'ok-vi',
          title: 'A',
          titleVi: 'B',
          content: big,
          contentVi: big,
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      expect(em.create).toHaveBeenCalled();
    });

    it('creates a page when metadataJson is null', async () => {
      await service.create(
        {
          slug: 'ok-slug',
          slugVi: 'ok-vi',
          title: 'A',
          titleVi: 'B',
          content: 'a',
          contentVi: 'b',
          metadataJson: null,
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      expect(em.create).toHaveBeenCalled();
    });

    it('strips empty metadata arrays before persisting', async () => {
      await service.create(
        {
          slug: 'ok-slug',
          slugVi: 'ok-vi',
          title: 'A',
          titleVi: 'B',
          content: 'a',
          contentVi: 'b',
          metadataJson: { tags: [], tags_vi: [], stats: {}, relatedPages: [] },
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      const persistedPage = em.create.mock.calls.find(
        (call: unknown[]) => (call[1] as any)?.slug === 'ok-slug',
      );
      expect(persistedPage).toBeDefined();
      expect(persistedPage![1].metadataJson).toBeNull();
    });

    it('keeps non-empty metadata fields on persist', async () => {
      await service.create(
        {
          slug: 'ok-slug',
          slugVi: 'ok-vi',
          title: 'A',
          titleVi: 'B',
          content: 'a',
          contentVi: 'b',
          metadataJson: {
            category: 'Character',
            tags: ['legendary'],
            tags_vi: [],
            stats: {},
            relatedPages: [],
          },
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      const persistedPage = em.create.mock.calls.find(
        (call: unknown[]) => (call[1] as any)?.slug === 'ok-slug',
      );
      expect(persistedPage).toBeDefined();
      expect(persistedPage![1].metadataJson).toEqual({
        category: 'Character',
        tags: ['legendary'],
      });
    });
  });

  describe('Abnormal', () => {
    it('translates Postgres unique violation on slugVi to ConflictException', async () => {
      const err: any = new Error(
        'duplicate key value violates unique constraint',
      );
      err.code = '23505';
      err.constraint = 'WikiPage_slugVi_key';
      em.flush.mockRejectedValueOnce(err);
      await expect(
        service.create(
          {
            slug: 'ok-slug',
            slugVi: 'ok-vi',
            title: 'A',
            titleVi: 'B',
            content: 'a',
            contentVi: 'b',
          } as any,
          'admin-1',
          '127.0.0.1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does NOT translate 23505 errors with unrelated constraint name', async () => {
      const err: any = new Error(
        'duplicate key value violates unique constraint',
      );
      err.code = '23505';
      err.constraint = 'something_else_key';
      em.flush.mockRejectedValueOnce(err);
      await expect(
        service.create(
          {
            slug: 'ok-slug',
            slugVi: 'ok-vi',
            title: 'A',
            titleVi: 'B',
            content: 'a',
            contentVi: 'b',
          } as any,
          'admin-1',
          '127.0.0.1',
        ),
      ).rejects.toMatchObject({ code: '23505' });
    });

    it('persists null when metadata has only category (partial wire shape, no defaults)', async () => {
      // Reproduces wire-boundary case: class-validator DTO passes {category: 'Character'}
      // straight through with no .tags / .tags_vi / .stats / .relatedPages defaults.
      // Persistence layer must not crash.
      await expect(
        service.create(
          {
            slug: 'partial-slug',
            slugVi: 'partial-vi',
            title: 'P',
            titleVi: 'P',
            content: 'a',
            contentVi: 'b',
            metadataJson: { category: 'Character' },
          } as any,
          'admin-1',
          '127.0.0.1',
        ),
      ).resolves.not.toThrow();
      const persistedPage = em.create.mock.calls.find(
        (call: unknown[]) => (call[1] as any)?.slug === 'partial-slug',
      );
      expect(persistedPage).toBeDefined();
      expect(persistedPage![1].metadataJson).toEqual({
        category: 'Character',
      });
    });
  });
});

describe('WikiRevisionService.create stub mode', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: {
    recordStandalone: jest.Mock;
    recordInCurrentUnitOfWork: jest.Mock;
  };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    const transactionalImpl = async (cb: any) => cb(em);
    em = {
      create: jest.fn((_entity, data) => ({
        ...data,
        id: data.id ?? 'new-id',
      })),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(transactionalImpl),
      getReference: jest.fn((_entity, id) => ({ id })),
    };
    audit = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInCurrentUnitOfWork: jest.fn(),
    };
    wikiSvc = {
      getByIdForAdmin: jest.fn().mockResolvedValue({ id: 'p1' } as any),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        ...repoProviders(em),
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('generates placeholder slug/title when stub=true', async () => {
    await service.create({ stub: true } as any, 'admin-1', '127.0.0.1');

    const page = em.create.mock.calls
      .map((c: unknown[]) => c[1] as any)
      .find((d: any) => typeof d?.slug === 'string');
    expect(page).toBeDefined();
    expect(page.slug).toMatch(/^untitled-[a-z0-9]{6}$/);
    expect(page.slugVi).toMatch(/^khong-ten-[a-z0-9]{6}$/);
    expect(page.title).toBe('');
    expect(page.titleVi).toBe('');
    expect(page.isPublished).toBe(false);
  });

  it('rejects non-stub payload missing required fields', async () => {
    await expect(
      service.create({} as any, 'admin-1', '127.0.0.1'),
    ).rejects.toThrow('wiki.invalid_input');
  });

  it('retries with a fresh slug on stub collision', async () => {
    const uniqueErr: any = new Error('duplicate key');
    uniqueErr.code = '23505';
    uniqueErr.constraint = 'WikiPage_slug_key';
    // First attempt's page flush collides; retry succeeds.
    em.flush = jest
      .fn()
      .mockRejectedValueOnce(uniqueErr)
      .mockResolvedValue(undefined);

    await expect(
      service.create({ stub: true } as any, 'admin-1', '127.0.0.1'),
    ).resolves.toBeDefined();
    expect(wikiSvc.getByIdForAdmin).toHaveBeenCalled();
  });
});

describe('WikiRevisionService.update', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: {
    recordStandalone: jest.Mock;
    recordInCurrentUnitOfWork: jest.Mock;
  };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      create: jest.fn((_e, data) => ({ ...data, id: 'new-rev' })),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(async (cb: any) => cb(em)),
      getReference: jest.fn((_e, id) => ({ id })),
    };
    audit = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInCurrentUnitOfWork: jest.fn(),
    };
    wikiSvc = { getByIdForAdmin: jest.fn().mockResolvedValue({} as any) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        ...repoProviders(em),
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  function fakePage(latestId: string) {
    return {
      id: 'p1',
      slug: 'old-slug',
      slugVi: 'old-vi',
      title: 'Old',
      titleVi: 'OldVi',
      metadataJson: null,
      isPublished: false,
      latestRevisionId: {
        id: latestId,
        content: 'OLD',
        contentVi: 'OLDVI',
        summary: null,
        summaryVi: null,
      },
    };
  }

  it('throws 404 when page missing', async () => {
    em.findOne.mockResolvedValueOnce(null);
    await expect(
      service.update(
        'p1',
        {
          expectedLatestRevisionId: 'r1',
          slug: 'a',
          slugVi: 'b',
          title: 't',
          titleVi: 'tv',
          content: 'c',
          contentVi: 'cv',
        } as any,
        'admin-1',
        '1.1.1.1',
      ),
    ).rejects.toThrow('wiki.not_found');
  });

  it('throws ConflictException with currentLatest payload on stale expectedLatestRevisionId', async () => {
    em.findOne.mockResolvedValueOnce(fakePage('r-current'));
    let captured: ConflictException | null = null;
    try {
      await service.update(
        'p1',
        {
          expectedLatestRevisionId: 'r-stale',
          slug: 'a',
          slugVi: 'b',
          title: 't',
          titleVi: 'tv',
          content: 'c',
          contentVi: 'cv',
        } as any,
        'admin-1',
        '1.1.1.1',
      );
    } catch (e) {
      captured = e as ConflictException;
    }
    expect(captured).toBeInstanceOf(ConflictException);
    const body = captured!.getResponse() as any;
    expect(body.message).toBe('wiki.conflict_revision');
    expect(body.currentLatest).toBeDefined();
    expect(body.currentLatest.id).toBe('r-current');
    expect(body.currentLatest.content).toBe('OLD');
    expect(body.currentLatest.contentVi).toBe('OLDVI');
  });

  it('proceeds when forceOverwrite is true even with mismatch', async () => {
    em.findOne.mockResolvedValueOnce(fakePage('r-current'));
    await service.update(
      'p1',
      {
        expectedLatestRevisionId: 'r-stale',
        forceOverwrite: true,
        slug: 'old-slug',
        slugVi: 'old-vi',
        title: 'Old',
        titleVi: 'OldVi',
        content: 'NEW',
        contentVi: 'NEWVI',
      } as any,
      'admin-1',
      '1.1.1.1',
    );
    expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({ forceOverwrite: true }),
      }),
    );
  });

  it('creates a snapshot revision when content unchanged but metadata changes', async () => {
    em.findOne.mockResolvedValueOnce(fakePage('r-current'));
    await service.update(
      'p1',
      {
        expectedLatestRevisionId: 'r-current',
        slug: 'new-slug',
        slugVi: 'old-vi',
        title: 'Old',
        titleVi: 'OldVi',
        content: 'OLD',
        contentVi: 'OLDVI', // unchanged
      } as any,
      'admin-1',
      '1.1.1.1',
    );
    // revision carries content snapshot only (entity has no slug/title columns)
    expect(em.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: 'OLD',
        contentVi: 'OLDVI',
      }),
    );
    // page slug changed → audit.recordInCurrentUnitOfWorkged
    expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalled();
  });

  it('detects total no-op and skips flush + audit', async () => {
    em.findOne.mockResolvedValueOnce(fakePage('r-current'));
    await service.update(
      'p1',
      {
        expectedLatestRevisionId: 'r-current',
        slug: 'old-slug',
        slugVi: 'old-vi',
        title: 'Old',
        titleVi: 'OldVi',
        content: 'OLD',
        contentVi: 'OLDVI',
      } as any,
      'admin-1',
      '1.1.1.1',
    );
    expect(em.create).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
    expect(audit.recordInCurrentUnitOfWork).not.toHaveBeenCalled();
  });

  it('treats reordered metadata keys as a total no-op', async () => {
    em.findOne.mockResolvedValueOnce({
      ...fakePage('r-current'),
      metadataJson: { tags: ['shape'], category: 'Character' },
    });
    await service.update(
      'p1',
      {
        expectedLatestRevisionId: 'r-current',
        slug: 'old-slug',
        slugVi: 'old-vi',
        title: 'Old',
        titleVi: 'OldVi',
        content: 'OLD',
        contentVi: 'OLDVI',
        metadataJson: {
          category: 'Character',
          tags: ['shape'],
          tags_vi: [],
          stats: {},
          stats_vi: {},
          relatedPages: [],
        },
      } as any,
      'admin-1',
      '1.1.1.1',
    );
    expect(em.create).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
    expect(audit.recordInCurrentUnitOfWork).not.toHaveBeenCalled();
  });

  it('rejects publishing with empty content', async () => {
    em.findOne.mockResolvedValueOnce({
      ...fakePage('r-current'),
      latestRevisionId: {
        id: 'r-current',
        content: '',
        contentVi: '',
        summary: null,
        summaryVi: null,
      },
    });
    await expect(
      service.update(
        'p1',
        {
          expectedLatestRevisionId: 'r-current',
          slug: 'old-slug',
          slugVi: 'old-vi',
          title: 'Old',
          titleVi: 'OldVi',
          content: '',
          contentVi: '',
          isPublished: true,
        } as any,
        'admin-1',
        '1.1.1.1',
      ),
    ).rejects.toThrow('wiki.cannot_publish_empty');
  });

  describe('Boundary', () => {
    it('updates only metadataJson — creates revision with new metadata snapshot and logs metadataJson in changedFields', async () => {
      em.findOne.mockResolvedValueOnce({
        ...fakePage('r-current'),
        metadataJson: { category: 'Character' },
      });
      await service.update(
        'p1',
        {
          expectedLatestRevisionId: 'r-current',
          slug: 'old-slug',
          slugVi: 'old-vi',
          title: 'Old',
          titleVi: 'OldVi',
          content: 'OLD',
          contentVi: 'OLDVI',
          metadataJson: {
            category: 'Item',
            tags: [],
            tags_vi: [],
            stats: {},
            relatedPages: [],
          },
        } as any,
        'admin-1',
        '1.1.1.1',
      );
      // revision carries only content/summary; metadata lives on the page
      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          content: 'OLD',
          contentVi: 'OLDVI',
        }),
      );
      expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: expect.objectContaining({
            changedFields: expect.arrayContaining(['metadataJson']),
          }),
        }),
      );
    });

    it('proceeds without conflict when expectedLatestRevisionId equals current latest', async () => {
      em.findOne.mockResolvedValueOnce(fakePage('r-current'));
      await expect(
        service.update(
          'p1',
          {
            expectedLatestRevisionId: 'r-current',
            slug: 'old-slug',
            slugVi: 'old-vi',
            title: 'Old',
            titleVi: 'OldVi',
            content: 'NEW',
            contentVi: 'NEWVI',
          } as any,
          'admin-1',
          '1.1.1.1',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('Abnormal', () => {
    it('throws conflict when latestRevisionId is null but expectedLatestRevisionId is non-empty', async () => {
      em.findOne.mockResolvedValueOnce({
        id: 'p1',
        slug: 'old-slug',
        slugVi: 'old-vi',
        title: 'Old',
        titleVi: 'OldVi',
        metadataJson: null,
        isPublished: false,
        latestRevisionId: null,
      });
      await expect(
        service.update(
          'p1',
          {
            expectedLatestRevisionId: 'r-anything',
            slug: 'old-slug',
            slugVi: 'old-vi',
            title: 'Old',
            titleVi: 'OldVi',
            content: 'NEW',
            contentVi: 'NEWVI',
          } as any,
          'admin-1',
          '1.1.1.1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

describe('WikiRevisionService.update writes full snapshot', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: {
    recordStandalone: jest.Mock;
    recordInCurrentUnitOfWork: jest.Mock;
  };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    const transactionalImpl = async (cb: any) => cb(em);
    em = {
      findOne: jest.fn(),
      create: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(transactionalImpl),
      getReference: jest.fn((_e: unknown, id: string) => ({ id })),
    };
    audit = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInCurrentUnitOfWork: jest.fn(),
    };
    wikiSvc = {
      getByIdForAdmin: jest.fn().mockResolvedValue({ id: 'p1' } as any),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        ...repoProviders(em),
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('persists content/summary onto the new revision and slug/title/metadata/isPublished onto the page', async () => {
    const existingPage: any = {
      id: 'p1',
      slug: 'old-slug',
      slugVi: 'old-slug-vi',
      title: 'Old',
      titleVi: 'Cũ',
      metadataJson: null,
      isPublished: false,
      latestRevisionId: {
        id: 'r1',
        content: '',
        contentVi: '',
        summary: null,
        summaryVi: null,
        createdAt: new Date(),
      },
    };
    const created: any[] = [];
    em.findOne = jest.fn().mockResolvedValue(existingPage);
    em.create = jest.fn((_e: unknown, data: any) => {
      const obj = { ...data, id: 'r2' };
      created.push(obj);
      return obj;
    });

    await service.update(
      'p1',
      {
        slug: 'new-slug',
        slugVi: 'old-slug-vi',
        title: 'New',
        titleVi: 'Mới',
        content: 'body',
        contentVi: 'thân',
        summary: 's',
        summaryVi: 't',
        metadataJson: { category: 'Character' },
        isPublished: true,
        expectedLatestRevisionId: 'r1',
      } as any,
      'admin-1',
      '127.0.0.1',
    );

    // Revision snapshots content/summary only (entity has no title/slug/metadata columns).
    const newRev = created.find((c) => c.id === 'r2');
    expect(newRev).toBeDefined();
    expect(newRev.content).toBe('body');
    expect(newRev.contentVi).toBe('thân');
    expect(newRev.summary).toBe('s');
    expect(newRev.summaryVi).toBe('t');
    // Slug/title/metadata/isPublished live on the page.
    expect(existingPage.slug).toBe('new-slug');
    expect(existingPage.slugVi).toBe('old-slug-vi');
    expect(existingPage.title).toBe('New');
    expect(existingPage.titleVi).toBe('Mới');
    expect(existingPage.metadataJson).toEqual({ category: 'Character' });
    expect(existingPage.isPublished).toBe(true);
  });

  it('translates Postgres unique violation on slug change to ConflictException', async () => {
    const existingPage: any = {
      id: 'p1',
      slug: 'old-slug',
      slugVi: 'old-slug-vi',
      title: 'Old',
      titleVi: 'Cũ',
      metadataJson: null,
      isPublished: false,
      latestRevisionId: {
        id: 'r1',
        content: '',
        contentVi: '',
        summary: null,
        summaryVi: null,
        createdAt: new Date(),
      },
    };
    em.findOne = jest.fn().mockResolvedValue(existingPage);
    em.create = jest.fn((_e: unknown, data: any) => ({ ...data, id: 'r2' }));
    const uniqueErr: any = new Error(
      'duplicate key value violates unique constraint',
    );
    uniqueErr.code = '23505';
    uniqueErr.constraint = 'WikiPage_slug_key';
    em.flush = jest.fn().mockRejectedValueOnce(uniqueErr);

    await expect(
      service.update(
        'p1',
        {
          slug: 'taken-slug',
          slugVi: 'old-slug-vi',
          title: 'Old',
          titleVi: 'Cũ',
          content: '',
          contentVi: '',
          metadataJson: null,
          expectedLatestRevisionId: 'r1',
        } as any,
        'admin-1',
        '127.0.0.1',
      ),
    ).rejects.toThrow('wiki.slug_taken');
  });
});

describe('WikiRevisionService.rollback', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: {
    recordStandalone: jest.Mock;
    recordInCurrentUnitOfWork: jest.Mock;
  };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      create: jest.fn((_e, data) => ({ ...data, id: 'rolled-back-rev' })),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(async (cb: any) => cb(em)),
      getReference: jest.fn((_e, id) => ({ id })),
    };
    audit = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInCurrentUnitOfWork: jest.fn(),
    };
    wikiSvc = { getByIdForAdmin: jest.fn().mockResolvedValue({} as any) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        ...repoProviders(em),
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('throws 404 when page missing', async () => {
    em.findOne.mockResolvedValueOnce(null);
    await expect(
      service.rollback(
        'p1',
        { targetRevisionId: 'r1', expectedLatestRevisionId: 'r2' },
        'admin-1',
        '1.1.1.1',
      ),
    ).rejects.toThrow('wiki.not_found');
  });

  it('throws conflict when latest mismatch', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      latestRevisionId: { id: 'r-current' },
    });
    await expect(
      service.rollback(
        'p1',
        { targetRevisionId: 'r1', expectedLatestRevisionId: 'r-stale' },
        'admin-1',
        '1.1.1.1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws revision_not_found when target belongs to another page', async () => {
    em.findOne
      .mockResolvedValueOnce({
        id: 'p1',
        latestRevisionId: { id: 'r-current' },
      })
      .mockResolvedValueOnce(null);
    await expect(
      service.rollback(
        'p1',
        { targetRevisionId: 'r-other', expectedLatestRevisionId: 'r-current' },
        'admin-1',
        '1.1.1.1',
      ),
    ).rejects.toThrow('wiki.revision_not_found');
  });

  it('returns no-op when target equals current latest', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      latestRevisionId: { id: 'r-current' },
    });
    await service.rollback(
      'p1',
      { targetRevisionId: 'r-current', expectedLatestRevisionId: 'r-current' },
      'admin-1',
      '1.1.1.1',
    );
    expect(em.create).not.toHaveBeenCalled();
    expect(audit.recordInCurrentUnitOfWork).not.toHaveBeenCalled();
  });

  it('creates new revision copying target content', async () => {
    em.findOne
      .mockResolvedValueOnce({
        id: 'p1',
        latestRevisionId: { id: 'r-current' },
      })
      .mockResolvedValueOnce({
        id: 'r-target',
        pageId: { id: 'p1' },
        content: 'OLD',
        contentVi: 'OLDVI',
        createdAt: new Date('2026-04-01'),
      });
    await service.rollback(
      'p1',
      { targetRevisionId: 'r-target', expectedLatestRevisionId: 'r-current' },
      'admin-1',
      '1.1.1.1',
    );
    expect(em.create).toHaveBeenCalled();
    expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({
          action: 'rollback',
          targetRevisionId: 'r-target',
        }),
      }),
    );
  });

  describe('Boundary', () => {
    it('rolls back to the oldest revision (target with empty content)', async () => {
      em.findOne
        .mockResolvedValueOnce({
          id: 'p1',
          latestRevisionId: { id: 'r-current' },
        })
        .mockResolvedValueOnce({
          id: 'r-oldest',
          pageId: { id: 'p1' },
          content: '',
          contentVi: '',
          createdAt: new Date('2026-01-01'),
        });
      await service.rollback(
        'p1',
        { targetRevisionId: 'r-oldest', expectedLatestRevisionId: 'r-current' },
        'admin-1',
        '1.1.1.1',
      );
      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ content: '', contentVi: '' }),
      );
    });
  });

  describe('Abnormal', () => {
    it('throws revision_not_found when page has 0 revisions yet a targetRevisionId is supplied', async () => {
      em.findOne
        .mockResolvedValueOnce({
          id: 'p1',
          latestRevisionId: { id: 'r-current' },
        })
        .mockResolvedValueOnce(null);
      await expect(
        service.rollback(
          'p1',
          {
            targetRevisionId: 'r-ghost',
            expectedLatestRevisionId: 'r-current',
          },
          'admin-1',
          '1.1.1.1',
        ),
      ).rejects.toThrow('wiki.revision_not_found');
    });
  });
});

describe('WikiRevisionService.rollback content restore', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: {
    recordStandalone: jest.Mock;
    recordInCurrentUnitOfWork: jest.Mock;
  };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    const transactionalImpl = async (cb: any) => cb(em);
    em = {
      findOne: jest.fn(),
      create: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(transactionalImpl),
      getReference: jest.fn((_e: unknown, id: string) => ({ id })),
    };
    audit = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInCurrentUnitOfWork: jest.fn(),
    };
    wikiSvc = {
      getByIdForAdmin: jest.fn().mockResolvedValue({ id: 'p1' } as any),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        ...repoProviders(em),
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('copies target content into a new revision and links it as latest', async () => {
    const page: any = {
      id: 'p1',
      slug: 'now-slug',
      slugVi: 'now-slug-vi',
      title: 'Now',
      titleVi: 'Bây giờ',
      metadataJson: { category: 'Item' },
      isPublished: true,
      latestRevisionId: { id: 'r3' },
    };
    const target: any = {
      id: 'r2',
      content: 'old body',
      contentVi: 'thân cũ',
      summary: 'old',
      summaryVi: 'cũ',
      createdAt: new Date('2026-05-01'),
    };
    const created: any[] = [];
    em.findOne = jest
      .fn()
      .mockResolvedValueOnce(page)
      .mockResolvedValueOnce(target);
    em.create = jest.fn((_e: unknown, data: any) => {
      const obj = { ...data, id: 'r4' };
      created.push(obj);
      return obj;
    });

    await service.rollback(
      'p1',
      { targetRevisionId: 'r2', expectedLatestRevisionId: 'r3' } as any,
      'admin-1',
      '127.0.0.1',
    );

    const restored = created.find((c) => c.id === 'r4');
    expect(restored.content).toBe('old body');
    expect(restored.contentVi).toBe('thân cũ');
    // Revision entity has no title/slug/metadata/isPublished columns — not copied.
    expect(restored.title).toBeUndefined();
    expect(restored.slug).toBeUndefined();
    // Page identity fields are untouched by rollback (only content is restored).
    expect(page.slug).toBe('now-slug');
    expect(page.title).toBe('Now');
    expect(page.latestRevisionId).toBe(restored);
  });

  it('translates slug-conflict on rollback page flush to ConflictException', async () => {
    const page: any = {
      id: 'p1',
      slug: 'now-slug',
      slugVi: 'now-slug-vi',
      title: 'Now',
      titleVi: 'Bây giờ',
      metadataJson: null,
      isPublished: true,
      latestRevisionId: { id: 'r3' },
    };
    const target: any = {
      id: 'r2',
      content: 'old',
      contentVi: 'cũ',
      summary: null,
      summaryVi: null,
      title: 'Old',
      titleVi: 'Cũ',
      slug: 'taken-slug',
      slugVi: 'old-slug-vi',
      metadataJson: null,
      isPublished: false,
      createdAt: new Date('2026-05-01'),
    };
    em.findOne = jest
      .fn()
      .mockResolvedValueOnce(page)
      .mockResolvedValueOnce(target);
    em.create = jest.fn((_e: unknown, data: any) => ({ ...data, id: 'r4' }));
    const uniqueErr: any = new Error(
      'duplicate key value violates unique constraint',
    );
    uniqueErr.code = '23505';
    uniqueErr.constraint = 'WikiPage_slug_key';
    // First flush (revision insert) succeeds; second flush (page mutation) collides.
    em.flush = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(uniqueErr);

    await expect(
      service.rollback(
        'p1',
        { targetRevisionId: 'r2', expectedLatestRevisionId: 'r3' } as any,
        'admin-1',
        '127.0.0.1',
      ),
    ).rejects.toThrow('wiki.slug_taken');
  });
});

describe('WikiRevisionService.delete', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: {
    recordStandalone: jest.Mock;
    recordInCurrentUnitOfWork: jest.Mock;
  };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      removeAndFlush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(async (cb: any) => cb(em)),
    };
    audit = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInCurrentUnitOfWork: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        ...repoProviders(em),
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: { getByIdForAdmin: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('throws 404 when page missing', async () => {
    em.findOne.mockResolvedValueOnce(null);
    await expect(service.delete('p1', 'admin-1', '1.1.1.1')).rejects.toThrow(
      'wiki.not_found',
    );
  });

  it('snapshots page + latest revision into audit oldValue', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      slug: 's',
      slugVi: 'sv',
      title: 't',
      titleVi: 'tv',
      metadataJson: null,
      isPublished: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      latestRevisionId: {
        id: 'r1',
        content: 'c',
        contentVi: 'cv',
        summary: null,
        summaryVi: null,
        authorId: { id: 'u1' },
        createdAt: new Date(),
      },
    });
    await service.delete('p1', 'admin-1', '1.1.1.1');
    expect(em.removeAndFlush).toHaveBeenCalled();
    expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'DELETE',
        oldValue: expect.objectContaining({
          page: expect.objectContaining({ id: 'p1' }),
          latestRevision: expect.objectContaining({ id: 'r1' }),
        }),
      }),
    );
  });

  describe('Boundary', () => {
    it('audit.recordInCurrentUnitOfWork includes latestRevision=null when page has no revisions', async () => {
      em.findOne.mockResolvedValueOnce({
        id: 'p1',
        slug: 's',
        slugVi: 'sv',
        title: 't',
        titleVi: 'tv',
        metadataJson: null,
        isPublished: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        latestRevisionId: null,
      });
      await service.delete('p1', 'admin-1', '1.1.1.1');
      expect(em.removeAndFlush).toHaveBeenCalled();
      expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'DELETE',
          oldValue: expect.objectContaining({
            latestRevision: null,
          }),
        }),
      );
    });
  });
});

describe('WikiRevisionService.publish/unpublish', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: {
    recordStandalone: jest.Mock;
    recordInCurrentUnitOfWork: jest.Mock;
  };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(async (cb: any) => cb(em)),
    };
    audit = {
      recordStandalone: jest.fn().mockResolvedValue(undefined),
      recordInCurrentUnitOfWork: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        ...repoProviders(em),
        { provide: WikiAuditService, useValue: audit },
        {
          provide: WikiService,
          useValue: { getByIdForAdmin: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('rejects publish with empty content', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      isPublished: false,
      latestRevisionId: { id: 'r1', content: '', contentVi: '' },
    });
    await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toThrow(
      'wiki.cannot_publish_empty',
    );
  });

  it('rejects publish with empty contentVi', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      isPublished: false,
      latestRevisionId: { id: 'r1', content: 'a', contentVi: '' },
    });
    await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toThrow(
      'wiki.cannot_publish_empty',
    );
  });

  it('publishes when content non-empty', async () => {
    const page: any = {
      id: 'p1',
      isPublished: false,
      latestRevisionId: { id: 'r1', content: 'a', contentVi: 'b' },
    };
    em.findOne.mockResolvedValueOnce(page);
    await service.publish('p1', 'admin-1', '1.1.1.1');
    expect(page.isPublished).toBe(true);
    expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({ action: 'publish' }),
      }),
    );
  });

  it('unpublishes regardless of content', async () => {
    const page: any = {
      id: 'p1',
      isPublished: true,
      latestRevisionId: { id: 'r1', content: '', contentVi: '' },
    };
    em.findOne.mockResolvedValueOnce(page);
    await service.unpublish('p1', 'admin-1', '1.1.1.1');
    expect(page.isPublished).toBe(false);
    expect(audit.recordInCurrentUnitOfWork).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({ action: 'unpublish' }),
      }),
    );
  });

  it('publish on already-published page is a no-op (no flush, no audit)', async () => {
    const page: any = {
      id: 'p1',
      isPublished: true,
      latestRevisionId: { id: 'r1', content: 'a', contentVi: 'b' },
    };
    em.findOne.mockResolvedValueOnce(page);
    await service.publish('p1', 'admin-1', '1.1.1.1');
    expect(em.flush).not.toHaveBeenCalled();
    expect(audit.recordInCurrentUnitOfWork).not.toHaveBeenCalled();
  });

  it('unpublish on already-unpublished page is a no-op (no flush, no audit)', async () => {
    const page: any = {
      id: 'p1',
      isPublished: false,
    };
    em.findOne.mockResolvedValueOnce(page);
    await service.unpublish('p1', 'admin-1', '1.1.1.1');
    expect(em.flush).not.toHaveBeenCalled();
    expect(audit.recordInCurrentUnitOfWork).not.toHaveBeenCalled();
  });

  it('rejects publish when latestRevisionId is null', async () => {
    em.findOne.mockResolvedValue({
      id: 'p1',
      isPublished: false,
      latestRevisionId: null,
    });
    await expect(
      service.publish('p1', 'admin-1', '1.1.1.1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toThrow(
      'wiki.cannot_publish_no_revision',
    );
  });

  describe('Boundary', () => {
    it('publishes when content is a single space (truthy, non-empty)', async () => {
      const page: any = {
        id: 'p1',
        isPublished: false,
        latestRevisionId: { id: 'r1', content: ' ', contentVi: ' ' },
      };
      em.findOne.mockResolvedValueOnce(page);
      await service.publish('p1', 'admin-1', '1.1.1.1');
      expect(page.isPublished).toBe(true);
    });

    it('publishes when both content and contentVi are minimum non-empty (single char)', async () => {
      const page: any = {
        id: 'p1',
        isPublished: false,
        latestRevisionId: { id: 'r1', content: 'a', contentVi: 'a' },
      };
      em.findOne.mockResolvedValueOnce(page);
      await service.publish('p1', 'admin-1', '1.1.1.1');
      expect(page.isPublished).toBe(true);
    });
  });

  describe('Abnormal', () => {
    it('rejects publish when content is 1MB but contentVi is empty', async () => {
      const big = 'a'.repeat(1_000_000);
      em.findOne.mockResolvedValueOnce({
        id: 'p1',
        isPublished: false,
        latestRevisionId: { id: 'r1', content: big, contentVi: '' },
      });
      await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toThrow(
        'wiki.cannot_publish_empty',
      );
    });
  });
});
