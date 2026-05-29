import { Test } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { WikiRevisionService } from './wiki-revision.service';
import { WikiAuditService } from './wiki-audit.service';
import { WikiService } from './wiki.service';

function makePostgresUniqueError() {
  const err: any = new Error('duplicate key value violates unique constraint');
  err.code = '23505';
  err.constraint = 'WikiPage_slug_key';
  return err;
}

describe('WikiRevisionService.create', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: { log: jest.Mock };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    const transactionalImpl = async (cb: any) => cb(em);
    em = {
      create: jest.fn((_entity, data) => ({ ...data, id: data.id ?? 'new-id' })),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(transactionalImpl),
      getReference: jest.fn((_entity, id) => ({ id })),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    wikiSvc = { getByIdForAdmin: jest.fn().mockResolvedValue({ id: 'p1' } as any) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        { provide: EntityManager, useValue: em },
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
          slug_vi: 'ok-slug',
          title: 'A', title_vi: 'B',
          content: '', content_vi: '',
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
          slug: 'admin', slug_vi: 'ok-vi',
          title: 'A', title_vi: 'B',
          content: '', content_vi: '',
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
          slug: 'ok-slug', slug_vi: 'ok-vi',
          title: 'A', title_vi: 'B',
          content: 'a', content_vi: 'b',
        } as any,
        'admin-1',
        '127.0.0.1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates page, revision, and links latestRevisionId', async () => {
    await service.create(
      {
        slug: 'ok-slug', slug_vi: 'ok-vi',
        title: 'A', title_vi: 'B',
        content: 'c', content_vi: 'd',
        summary: 's', summary_vi: 'sv',
        isPublished: false,
      } as any,
      'admin-1',
      '127.0.0.1',
    );
    expect(em.create).toHaveBeenCalled();
    expect(em.flush).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
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
          slug: 'ok-slug', slug_vi: 'ok-vi',
          title: 'A', title_vi: 'B',
          content: '', content_vi: '',
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      expect(em.create).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalled();
    });

    it('creates a page with content of 1MB', async () => {
      const big = 'a'.repeat(1_000_000);
      await service.create(
        {
          slug: 'ok-slug', slug_vi: 'ok-vi',
          title: 'A', title_vi: 'B',
          content: big, content_vi: big,
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      expect(em.create).toHaveBeenCalled();
    });

    it('creates a page when metadataJson is null', async () => {
      await service.create(
        {
          slug: 'ok-slug', slug_vi: 'ok-vi',
          title: 'A', title_vi: 'B',
          content: 'a', content_vi: 'b',
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
          slug: 'ok-slug', slug_vi: 'ok-vi',
          title: 'A', title_vi: 'B',
          content: 'a', content_vi: 'b',
          metadataJson: { tags: [], tags_vi: [], stats: {}, relatedPages: [] },
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      const persistedPage = em.create.mock.calls.find(
        (call: unknown[]) => (call[1] as any)?.slug === 'ok-slug',
      );
      expect(persistedPage).toBeDefined();
      expect((persistedPage![1] as any).metadataJson).toBeNull();
    });

    it('keeps non-empty metadata fields on persist', async () => {
      await service.create(
        {
          slug: 'ok-slug', slug_vi: 'ok-vi',
          title: 'A', title_vi: 'B',
          content: 'a', content_vi: 'b',
          metadataJson: { category: 'Boss', tags: ['legendary'], tags_vi: [], stats: {}, relatedPages: [] },
        } as any,
        'admin-1',
        '127.0.0.1',
      );
      const persistedPage = em.create.mock.calls.find(
        (call: unknown[]) => (call[1] as any)?.slug === 'ok-slug',
      );
      expect(persistedPage).toBeDefined();
      expect((persistedPage![1] as any).metadataJson).toEqual({
        category: 'Boss',
        tags: ['legendary'],
      });
    });
  });

  describe('Abnormal', () => {
    it('translates Postgres unique violation on slug_vi to ConflictException', async () => {
      const err: any = new Error('duplicate key value violates unique constraint');
      err.code = '23505';
      err.constraint = 'WikiPage_slug_vi_key';
      em.flush.mockRejectedValueOnce(err);
      await expect(
        service.create(
          {
            slug: 'ok-slug', slug_vi: 'ok-vi',
            title: 'A', title_vi: 'B',
            content: 'a', content_vi: 'b',
          } as any,
          'admin-1', '127.0.0.1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does NOT translate 23505 errors with unrelated constraint name', async () => {
      const err: any = new Error('duplicate key value violates unique constraint');
      err.code = '23505';
      err.constraint = 'something_else_key';
      em.flush.mockRejectedValueOnce(err);
      await expect(
        service.create(
          {
            slug: 'ok-slug', slug_vi: 'ok-vi',
            title: 'A', title_vi: 'B',
            content: 'a', content_vi: 'b',
          } as any,
          'admin-1', '127.0.0.1',
        ),
      ).rejects.toMatchObject({ code: '23505' });
    });

    it('persists null when metadata has only category (partial wire shape, no defaults)', async () => {
      // Reproduces wire-boundary case: class-validator DTO passes {category: 'Boss'}
      // straight through with no .tags / .tags_vi / .stats / .relatedPages defaults.
      // Persistence layer must not crash.
      await expect(
        service.create(
          {
            slug: 'partial-slug', slug_vi: 'partial-vi',
            title: 'P', title_vi: 'P',
            content: 'a', content_vi: 'b',
            metadataJson: { category: 'Boss' },
          } as any,
          'admin-1',
          '127.0.0.1',
        ),
      ).resolves.not.toThrow();
      const persistedPage = em.create.mock.calls.find(
        (call: unknown[]) => (call[1] as any)?.slug === 'partial-slug',
      );
      expect(persistedPage).toBeDefined();
      expect((persistedPage![1] as any).metadataJson).toEqual({ category: 'Boss' });
    });
  });
});

describe('WikiRevisionService.update', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: { log: jest.Mock };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      create: jest.fn((_e, data) => ({ ...data, id: 'new-rev' })),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(async (cb: any) => cb(em)),
      getReference: jest.fn((_e, id) => ({ id })),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    wikiSvc = { getByIdForAdmin: jest.fn().mockResolvedValue({} as any) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        { provide: EntityManager, useValue: em },
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  function fakePage(latestId: string) {
    return {
      id: 'p1',
      slug: 'old-slug', slug_vi: 'old-vi',
      title: 'Old', title_vi: 'OldVi',
      metadataJson: null,
      isPublished: false,
      latestRevisionId: {
        id: latestId,
        content: 'OLD', content_vi: 'OLD_VI',
        summary: null, summary_vi: null,
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
          slug: 'a', slug_vi: 'b', title: 't', title_vi: 'tv',
          content: 'c', content_vi: 'cv',
        } as any,
        'admin-1', '1.1.1.1',
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
          slug: 'a', slug_vi: 'b', title: 't', title_vi: 'tv',
          content: 'c', content_vi: 'cv',
        } as any,
        'admin-1', '1.1.1.1',
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
    expect(body.currentLatest.content_vi).toBe('OLD_VI');
  });

  it('proceeds when forceOverwrite is true even with mismatch', async () => {
    em.findOne.mockResolvedValueOnce(fakePage('r-current'));
    await service.update(
      'p1',
      {
        expectedLatestRevisionId: 'r-stale',
        forceOverwrite: true,
        slug: 'old-slug', slug_vi: 'old-vi',
        title: 'Old', title_vi: 'OldVi',
        content: 'NEW', content_vi: 'NEW_VI',
      } as any,
      'admin-1', '1.1.1.1',
    );
    expect(audit.log).toHaveBeenCalledWith(
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
        slug: 'new-slug', slug_vi: 'old-vi',
        title: 'Old', title_vi: 'OldVi',
        content: 'OLD', content_vi: 'OLD_VI',  // unchanged
      } as any,
      'admin-1', '1.1.1.1',
    );
    // revision created with full snapshot (content from dto, slug from dto)
    expect(em.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        content: 'OLD',
        content_vi: 'OLD_VI',
        slug: 'new-slug',
        slug_vi: 'old-vi',
        title: 'Old',
        title_vi: 'OldVi',
      }),
    );
    // page metadata changed → audit logged
    expect(audit.log).toHaveBeenCalled();
  });

  it('detects total no-op and skips flush + audit', async () => {
    em.findOne.mockResolvedValueOnce(fakePage('r-current'));
    await service.update(
      'p1',
      {
        expectedLatestRevisionId: 'r-current',
        slug: 'old-slug', slug_vi: 'old-vi',
        title: 'Old', title_vi: 'OldVi',
        content: 'OLD', content_vi: 'OLD_VI',
      } as any,
      'admin-1', '1.1.1.1',
    );
    expect(em.create).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects publishing with empty content', async () => {
    em.findOne.mockResolvedValueOnce({
      ...fakePage('r-current'),
      latestRevisionId: {
        id: 'r-current', content: '', content_vi: '',
        summary: null, summary_vi: null,
      },
    });
    await expect(
      service.update(
        'p1',
        {
          expectedLatestRevisionId: 'r-current',
          slug: 'old-slug', slug_vi: 'old-vi',
          title: 'Old', title_vi: 'OldVi',
          content: '', content_vi: '',
          isPublished: true,
        } as any,
        'admin-1', '1.1.1.1',
      ),
    ).rejects.toThrow('wiki.cannot_publish_empty');
  });

  describe('Boundary', () => {
    it('updates only metadataJson — creates revision with new metadata snapshot and logs metadataJson in changedFields', async () => {
      em.findOne.mockResolvedValueOnce({
        ...fakePage('r-current'),
        metadataJson: { category: 'Boss' },
      });
      await service.update(
        'p1',
        {
          expectedLatestRevisionId: 'r-current',
          slug: 'old-slug', slug_vi: 'old-vi',
          title: 'Old', title_vi: 'OldVi',
          content: 'OLD', content_vi: 'OLD_VI',
          metadataJson: { category: 'Item', tags: [], tags_vi: [], stats: {}, relatedPages: [] },
        } as any,
        'admin-1', '1.1.1.1',
      );
      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadataJson: { category: 'Item' },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
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
            slug: 'old-slug', slug_vi: 'old-vi',
            title: 'Old', title_vi: 'OldVi',
            content: 'NEW', content_vi: 'NEW_VI',
          } as any,
          'admin-1', '1.1.1.1',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('Abnormal', () => {
    it('throws conflict when latestRevisionId is null but expectedLatestRevisionId is non-empty', async () => {
      em.findOne.mockResolvedValueOnce({
        id: 'p1',
        slug: 'old-slug', slug_vi: 'old-vi',
        title: 'Old', title_vi: 'OldVi',
        metadataJson: null,
        isPublished: false,
        latestRevisionId: null,
      });
      await expect(
        service.update(
          'p1',
          {
            expectedLatestRevisionId: 'r-anything',
            slug: 'old-slug', slug_vi: 'old-vi',
            title: 'Old', title_vi: 'OldVi',
            content: 'NEW', content_vi: 'NEW_VI',
          } as any,
          'admin-1', '1.1.1.1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

describe('WikiRevisionService.update writes full snapshot', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: { log: jest.Mock };
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
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    wikiSvc = { getByIdForAdmin: jest.fn().mockResolvedValue({ id: 'p1' } as any) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        { provide: EntityManager, useValue: em },
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('persists title/slug/metadata/isPublished onto the new revision', async () => {
    const existingPage: any = {
      id: 'p1',
      slug: 'old-slug',
      slug_vi: 'old-slug-vi',
      title: 'Old',
      title_vi: 'Cũ',
      metadataJson: null,
      isPublished: false,
      latestRevisionId: { id: 'r1', content: '', content_vi: '', summary: null, summary_vi: null, createdAt: new Date() },
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
        slug_vi: 'old-slug-vi',
        title: 'New',
        title_vi: 'Mới',
        content: 'body',
        content_vi: 'thân',
        summary: 's',
        summary_vi: 't',
        metadataJson: { category: 'Boss' },
        isPublished: true,
        expectedLatestRevisionId: 'r1',
      } as any,
      'admin-1',
      '127.0.0.1',
    );

    const newRev = created.find((c) => c.id === 'r2');
    expect(newRev).toBeDefined();
    expect(newRev.title).toBe('New');
    expect(newRev.title_vi).toBe('Mới');
    expect(newRev.slug).toBe('new-slug');
    expect(newRev.slug_vi).toBe('old-slug-vi');
    expect(newRev.metadataJson).toEqual({ category: 'Boss' });
    expect(newRev.isPublished).toBe(true);
  });

  it('translates Postgres unique violation on slug change to ConflictException', async () => {
    const existingPage: any = {
      id: 'p1',
      slug: 'old-slug',
      slug_vi: 'old-slug-vi',
      title: 'Old',
      title_vi: 'Cũ',
      metadataJson: null,
      isPublished: false,
      latestRevisionId: { id: 'r1', content: '', content_vi: '', summary: null, summary_vi: null, createdAt: new Date() },
    };
    em.findOne = jest.fn().mockResolvedValue(existingPage);
    em.create = jest.fn((_e: unknown, data: any) => ({ ...data, id: 'r2' }));
    const uniqueErr: any = new Error('duplicate key value violates unique constraint');
    uniqueErr.code = '23505';
    uniqueErr.constraint = 'WikiPage_slug_key';
    em.flush = jest.fn().mockRejectedValueOnce(uniqueErr);

    await expect(
      service.update(
        'p1',
        {
          slug: 'taken-slug',
          slug_vi: 'old-slug-vi',
          title: 'Old',
          title_vi: 'Cũ',
          content: '',
          content_vi: '',
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
  let audit: { log: jest.Mock };
  let wikiSvc: { getByIdForAdmin: jest.Mock };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      create: jest.fn((_e, data) => ({ ...data, id: 'rolled-back-rev' })),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(async (cb: any) => cb(em)),
      getReference: jest.fn((_e, id) => ({ id })),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    wikiSvc = { getByIdForAdmin: jest.fn().mockResolvedValue({} as any) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        { provide: EntityManager, useValue: em },
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('throws 404 when page missing', async () => {
    em.findOne.mockResolvedValueOnce(null);
    await expect(
      service.rollback('p1', { targetRevisionId: 'r1', expectedLatestRevisionId: 'r2' }, 'admin-1', '1.1.1.1'),
    ).rejects.toThrow('wiki.not_found');
  });

  it('throws conflict when latest mismatch', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1',
      latestRevisionId: { id: 'r-current' },
    });
    await expect(
      service.rollback('p1', { targetRevisionId: 'r1', expectedLatestRevisionId: 'r-stale' }, 'admin-1', '1.1.1.1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws revision_not_found when target belongs to another page', async () => {
    em.findOne
      .mockResolvedValueOnce({
        id: 'p1', latestRevisionId: { id: 'r-current' },
      })
      .mockResolvedValueOnce(null);
    await expect(
      service.rollback('p1', { targetRevisionId: 'r-other', expectedLatestRevisionId: 'r-current' }, 'admin-1', '1.1.1.1'),
    ).rejects.toThrow('wiki.revision_not_found');
  });

  it('returns no-op when target equals current latest', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1', latestRevisionId: { id: 'r-current' },
    });
    await service.rollback(
      'p1',
      { targetRevisionId: 'r-current', expectedLatestRevisionId: 'r-current' },
      'admin-1', '1.1.1.1',
    );
    expect(em.create).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('creates new revision copying target content', async () => {
    em.findOne
      .mockResolvedValueOnce({
        id: 'p1', latestRevisionId: { id: 'r-current' },
      })
      .mockResolvedValueOnce({
        id: 'r-target',
        pageId: { id: 'p1' },
        content: 'OLD', content_vi: 'OLD_VI',
        createdAt: new Date('2026-04-01'),
      });
    await service.rollback(
      'p1',
      { targetRevisionId: 'r-target', expectedLatestRevisionId: 'r-current' },
      'admin-1', '1.1.1.1',
    );
    expect(em.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
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
          id: 'p1', latestRevisionId: { id: 'r-current' },
        })
        .mockResolvedValueOnce({
          id: 'r-oldest',
          pageId: { id: 'p1' },
          content: '', content_vi: '',
          createdAt: new Date('2026-01-01'),
        });
      await service.rollback(
        'p1',
        { targetRevisionId: 'r-oldest', expectedLatestRevisionId: 'r-current' },
        'admin-1', '1.1.1.1',
      );
      expect(em.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ content: '', content_vi: '' }),
      );
    });
  });

  describe('Abnormal', () => {
    it('throws revision_not_found when page has 0 revisions yet a targetRevisionId is supplied', async () => {
      em.findOne
        .mockResolvedValueOnce({
          id: 'p1', latestRevisionId: { id: 'r-current' },
        })
        .mockResolvedValueOnce(null);
      await expect(
        service.rollback(
          'p1',
          { targetRevisionId: 'r-ghost', expectedLatestRevisionId: 'r-current' },
          'admin-1', '1.1.1.1',
        ),
      ).rejects.toThrow('wiki.revision_not_found');
    });
  });
});

describe('WikiRevisionService.rollback applies full snapshot', () => {
  let service: WikiRevisionService;
  let em: any;
  let audit: { log: jest.Mock };
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
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    wikiSvc = { getByIdForAdmin: jest.fn().mockResolvedValue({ id: 'p1' } as any) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        { provide: EntityManager, useValue: em },
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: wikiSvc },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('restores title/slug/metadata/isPublished from target revision', async () => {
    const page: any = {
      id: 'p1',
      slug: 'now-slug', slug_vi: 'now-slug-vi',
      title: 'Now', title_vi: 'Bây giờ',
      metadataJson: { category: 'Item' },
      isPublished: true,
      latestRevisionId: { id: 'r3' },
    };
    const target: any = {
      id: 'r2',
      content: 'old body', content_vi: 'thân cũ',
      summary: 'old', summary_vi: 'cũ',
      title: 'Old', title_vi: 'Cũ',
      slug: 'old-slug', slug_vi: 'old-slug-vi',
      metadataJson: { category: 'Boss' },
      isPublished: false,
      createdAt: new Date('2026-05-01'),
    };
    const created: any[] = [];
    em.findOne = jest.fn()
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
    expect(restored.title).toBe('Old');
    expect(restored.title_vi).toBe('Cũ');
    expect(restored.slug).toBe('old-slug');
    expect(restored.slug_vi).toBe('old-slug-vi');
    expect(restored.content).toBe('old body');
    expect(restored.metadataJson).toEqual({ category: 'Boss' });
    expect(restored.isPublished).toBe(false);
    expect(page.title).toBe('Old');
    expect(page.title_vi).toBe('Cũ');
    expect(page.slug).toBe('old-slug');
    expect(page.slug_vi).toBe('old-slug-vi');
    expect(page.metadataJson).toEqual({ category: 'Boss' });
    expect(page.isPublished).toBe(false);
    expect(page.latestRevisionId).toBe(restored);
  });

  it('translates slug-conflict on rollback page flush to ConflictException', async () => {
    const page: any = {
      id: 'p1',
      slug: 'now-slug', slug_vi: 'now-slug-vi',
      title: 'Now', title_vi: 'Bây giờ',
      metadataJson: null,
      isPublished: true,
      latestRevisionId: { id: 'r3' },
    };
    const target: any = {
      id: 'r2',
      content: 'old', content_vi: 'cũ',
      summary: null, summary_vi: null,
      title: 'Old', title_vi: 'Cũ',
      slug: 'taken-slug', slug_vi: 'old-slug-vi',
      metadataJson: null,
      isPublished: false,
      createdAt: new Date('2026-05-01'),
    };
    em.findOne = jest.fn()
      .mockResolvedValueOnce(page)
      .mockResolvedValueOnce(target);
    em.create = jest.fn((_e: unknown, data: any) => ({ ...data, id: 'r4' }));
    const uniqueErr: any = new Error('duplicate key value violates unique constraint');
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
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      removeAndFlush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(async (cb: any) => cb(em)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        { provide: EntityManager, useValue: em },
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: { getByIdForAdmin: jest.fn() } },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('throws 404 when page missing', async () => {
    em.findOne.mockResolvedValueOnce(null);
    await expect(service.delete('p1', 'admin-1', '1.1.1.1')).rejects.toThrow('wiki.not_found');
  });

  it('snapshots page + latest revision into audit oldValue', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1', slug: 's', slug_vi: 'sv', title: 't', title_vi: 'tv',
      metadataJson: null, isPublished: false,
      createdAt: new Date(), updatedAt: new Date(),
      latestRevisionId: {
        id: 'r1', content: 'c', content_vi: 'cv',
        summary: null, summary_vi: null,
        authorId: { id: 'u1' },
        createdAt: new Date(),
      },
    });
    await service.delete('p1', 'admin-1', '1.1.1.1');
    expect(em.removeAndFlush).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
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
    it('audit log includes latestRevision=null when page has no revisions', async () => {
      em.findOne.mockResolvedValueOnce({
        id: 'p1', slug: 's', slug_vi: 'sv', title: 't', title_vi: 'tv',
        metadataJson: null, isPublished: false,
        createdAt: new Date(), updatedAt: new Date(),
        latestRevisionId: null,
      });
      await service.delete('p1', 'admin-1', '1.1.1.1');
      expect(em.removeAndFlush).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
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
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    em = {
      findOne: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      transactional: jest.fn(async (cb: any) => cb(em)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    const moduleRef = await Test.createTestingModule({
      providers: [
        WikiRevisionService,
        { provide: EntityManager, useValue: em },
        { provide: WikiAuditService, useValue: audit },
        { provide: WikiService, useValue: { getByIdForAdmin: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();
    service = moduleRef.get(WikiRevisionService);
  });

  it('rejects publish with empty content', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1', isPublished: false,
      latestRevisionId: { id: 'r1', content: '', content_vi: '' },
    });
    await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toThrow('wiki.cannot_publish_empty');
  });

  it('rejects publish with empty content_vi', async () => {
    em.findOne.mockResolvedValueOnce({
      id: 'p1', isPublished: false,
      latestRevisionId: { id: 'r1', content: 'a', content_vi: '' },
    });
    await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toThrow('wiki.cannot_publish_empty');
  });

  it('publishes when content non-empty', async () => {
    const page: any = {
      id: 'p1', isPublished: false,
      latestRevisionId: { id: 'r1', content: 'a', content_vi: 'b' },
    };
    em.findOne.mockResolvedValueOnce(page);
    await service.publish('p1', 'admin-1', '1.1.1.1');
    expect(page.isPublished).toBe(true);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({ action: 'publish' }),
      }),
    );
  });

  it('unpublishes regardless of content', async () => {
    const page: any = {
      id: 'p1', isPublished: true,
      latestRevisionId: { id: 'r1', content: '', content_vi: '' },
    };
    em.findOne.mockResolvedValueOnce(page);
    await service.unpublish('p1', 'admin-1', '1.1.1.1');
    expect(page.isPublished).toBe(false);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: expect.objectContaining({ action: 'unpublish' }),
      }),
    );
  });

  it('publish on already-published page is a no-op (no flush, no audit)', async () => {
    const page: any = {
      id: 'p1', isPublished: true,
      latestRevisionId: { id: 'r1', content: 'a', content_vi: 'b' },
    };
    em.findOne.mockResolvedValueOnce(page);
    await service.publish('p1', 'admin-1', '1.1.1.1');
    expect(em.flush).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('unpublish on already-unpublished page is a no-op (no flush, no audit)', async () => {
    const page: any = {
      id: 'p1', isPublished: false,
    };
    em.findOne.mockResolvedValueOnce(page);
    await service.unpublish('p1', 'admin-1', '1.1.1.1');
    expect(em.flush).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it('rejects publish when latestRevisionId is null', async () => {
    em.findOne.mockResolvedValue({
      id: 'p1', isPublished: false,
      latestRevisionId: null,
    });
    await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toThrow('wiki.cannot_publish_no_revision');
  });

  describe('Boundary', () => {
    it('publishes when content is a single space (truthy, non-empty)', async () => {
      const page: any = {
        id: 'p1', isPublished: false,
        latestRevisionId: { id: 'r1', content: ' ', content_vi: ' ' },
      };
      em.findOne.mockResolvedValueOnce(page);
      await service.publish('p1', 'admin-1', '1.1.1.1');
      expect(page.isPublished).toBe(true);
    });

    it('publishes when both content and content_vi are minimum non-empty (single char)', async () => {
      const page: any = {
        id: 'p1', isPublished: false,
        latestRevisionId: { id: 'r1', content: 'a', content_vi: 'a' },
      };
      em.findOne.mockResolvedValueOnce(page);
      await service.publish('p1', 'admin-1', '1.1.1.1');
      expect(page.isPublished).toBe(true);
    });
  });

  describe('Abnormal', () => {
    it('rejects publish when content is 1MB but content_vi is empty', async () => {
      const big = 'a'.repeat(1_000_000);
      em.findOne.mockResolvedValueOnce({
        id: 'p1', isPublished: false,
        latestRevisionId: { id: 'r1', content: big, content_vi: '' },
      });
      await expect(service.publish('p1', 'admin-1', '1.1.1.1')).rejects.toThrow('wiki.cannot_publish_empty');
    });
  });
});
