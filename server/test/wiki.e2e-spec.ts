// PREREQUISITE: the test database must contain at least one ADMIN user matching
// E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD. A USER-role account is optional for the
// role-gate tests; tests that need it will be skipped via the `userToken` guard.
//
// This suite requires a live Postgres + Redis stack (docker-compose up). It is
// not run in CI by default; run manually with:
//   cd server && npm run test:e2e -- wiki
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { StandardApiResponseInterceptor } from '../src/common/interceptors/standard-api-response.interceptor';
import { I18nService } from '../src/common/i18n/i18n.service';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@borrowed-shapes.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin@1234';
const USER_EMAIL = process.env.E2E_USER_EMAIL ?? 'user@borrowed-shapes.local';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'User@1234';

async function login(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password, platform: 'web' })
    .expect(200);
  return res.body.data.accessToken as string;
}

describe('Wiki module (e2e)', () => {
  let app: NestExpressApplication;
  let adminToken: string;
  let userToken: string | null = null;
  let createdPageId: string | null = null;
  let firstRevisionId: string | null = null;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    const i18n = app.get(I18nService);
    app.useGlobalInterceptors(new StandardApiResponseInterceptor(i18n));
    app.useGlobalFilters(new GlobalExceptionFilter(i18n));
    await app.init();

    adminToken = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    try {
      userToken = await login(app, USER_EMAIL, USER_PASSWORD);
    } catch {
      userToken = null; // tests requiring user role will skip if no user seeded
    }
  });

  afterAll(async () => {
    if (createdPageId) {
      await request(app.getHttpServer())
        .delete(`/api/wiki/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .catch(() => {});
    }
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Task 11.2: Public read endpoints (BR-66, BR-77, BR-78)
  // ---------------------------------------------------------------------------
  describe('Public read endpoints', () => {
    beforeAll(async () => {
      // Seed a published page for public-read tests
      const res = await request(app.getHttpServer())
        .post('/api/wiki')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'e2e-pub',
          slug_vi: 'e2e-pub-vi',
          title: 'E2E Public',
          title_vi: 'E2E Cong khai',
          content: '# Heading\nbody',
          content_vi: '# Tieu de\nnoi dung',
          isPublished: true,
        })
        .expect(201);
      createdPageId = res.body.data.id;
      firstRevisionId = res.body.data.latestRevision.id;
    });

    it('GET /wiki returns paginated published pages without auth (BR-77)', async () => {
      const res = await request(app.getHttpServer()).get('/api/wiki').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        page: 1,
        limit: 20,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
      expect(
        res.body.data.items.some((i: { id: string }) => i.id === createdPageId),
      ).toBe(true);
    });

    it('GET /wiki/slug/:slug returns detail by EN slug (BR-78)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/wiki/slug/e2e-pub')
        .expect(200);
      expect(res.body.data.matchedSlugLocale).toBe('en');
      expect(res.body.data.latestRevision.content).toContain('Heading');
    });

    it('GET /wiki/slug/:slug returns detail by VI slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/wiki/slug/e2e-pub-vi')
        .expect(200);
      expect(res.body.data.matchedSlugLocale).toBe('vi');
    });

    it('GET /wiki/slug/:slug returns 404 for unknown slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/wiki/slug/no-such-slug')
        .expect(404);
      expect(res.body.message).toBe('wiki.not_found');
    });

    it('GET /wiki/search filters by title (BR-66)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/wiki/search')
        .query({ q: 'E2E' })
        .expect(200);
      expect(
        res.body.data.items.some((i: { id: string }) => i.id === createdPageId),
      ).toBe(true);
    });

    it('GET /wiki rejects oversize limit by clamping', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/wiki')
        .query({ limit: 9999 })
        .expect(200);
      expect(res.body.data.limit).toBeLessThanOrEqual(50);
    });

    it('GET /wiki/search rejects oversize q', async () => {
      await request(app.getHttpServer())
        .get('/api/wiki/search')
        .query({ q: 'x'.repeat(501) })
        .expect(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Task 11.3: Admin write endpoints + role gates (BR-83, BR-84, BR-113, BR-114, BR-115)
  // ---------------------------------------------------------------------------
  describe('Admin write endpoints', () => {
    it('POST /wiki rejects guests with 401 (BR-113)', async () => {
      await request(app.getHttpServer())
        .post('/api/wiki')
        .send({
          slug: 'guest-attempt',
          slug_vi: 'guest-attempt-vi',
          title: 't',
          title_vi: 'tv',
          content: '',
          content_vi: '',
        })
        .expect(401);
    });

    it('POST /wiki rejects users with 403', async () => {
      if (!userToken) return; // skip if no user seeded
      await request(app.getHttpServer())
        .post('/api/wiki')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          slug: 'user-attempt',
          slug_vi: 'user-attempt-vi',
          title: 't',
          title_vi: 'tv',
          content: '',
          content_vi: '',
        })
        .expect(403);
    });

    it('POST /wiki rejects reserved slug', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/wiki')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'admin',
          slug_vi: 'admin-vi',
          title: 't',
          title_vi: 'tv',
          content: '',
          content_vi: '',
        })
        .expect(400);
      expect(res.body.message).toBe('wiki.reserved_slug');
    });

    it('POST /wiki rejects duplicate slug with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/wiki')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'e2e-pub',
          slug_vi: 'e2e-dup-vi',
          title: 'd',
          title_vi: 'dv',
          content: '',
          content_vi: '',
        })
        .expect(409);
    });

    it('PUT /wiki/:id with stale revision returns 409 (BR-114)', async () => {
      expect(createdPageId).toBeTruthy();
      expect(firstRevisionId).toBeTruthy();

      // First successful update — produces new revision
      const ok = await request(app.getHttpServer())
        .put(`/api/wiki/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'e2e-pub',
          slug_vi: 'e2e-pub-vi',
          title: 'E2E Public V2',
          title_vi: 'E2E Cong khai V2',
          content: 'updated',
          content_vi: 'cap nhat',
          expectedLatestRevisionId: firstRevisionId,
        })
        .expect(200);

      const newRev = ok.body.data.latestRevision.id;
      expect(newRev).not.toBe(firstRevisionId);

      // Stale update -> 409
      const stale = await request(app.getHttpServer())
        .put(`/api/wiki/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'e2e-pub',
          slug_vi: 'e2e-pub-vi',
          title: 'stale',
          title_vi: 'stale-vi',
          content: 'x',
          content_vi: 'y',
          expectedLatestRevisionId: firstRevisionId, // intentionally stale
        })
        .expect(409);
      expect(stale.body.message).toBe('wiki.conflict_revision');

      firstRevisionId = newRev;
    });

    it('PUT /wiki/:id with forceOverwrite bypasses stale check', async () => {
      // Use an obviously-wrong expectedLatestRevisionId but set forceOverwrite=true
      const res = await request(app.getHttpServer())
        .put(`/api/wiki/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slug: 'e2e-pub',
          slug_vi: 'e2e-pub-vi',
          title: 'Forced',
          title_vi: 'Forced VI',
          content: 'forced',
          content_vi: 'forced vi',
          expectedLatestRevisionId: 'definitely-not-current',
          forceOverwrite: true,
        })
        .expect(200);
      expect(res.body.data.latestRevision.content).toBe('forced');
      firstRevisionId = res.body.data.latestRevision.id;
    });

    it('POST /wiki/:id/rollback creates new revision from target (BR-83)', async () => {
      const hist = await request(app.getHttpServer())
        .get(`/api/wiki/${createdPageId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const earliest =
        hist.body.data.items[hist.body.data.items.length - 1].id;
      expect(earliest).toBeTruthy();

      const res = await request(app.getHttpServer())
        .post(`/api/wiki/${createdPageId}/rollback`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          targetRevisionId: earliest,
          expectedLatestRevisionId: firstRevisionId,
        })
        .expect(200);
      expect(res.body.data.latestRevision.id).not.toBe(earliest);
      firstRevisionId = res.body.data.latestRevision.id;
    });

    it('GET /wiki/:id/history requires login (BR-84)', async () => {
      await request(app.getHttpServer())
        .get(`/api/wiki/${createdPageId}/history`)
        .expect(401);
    });

    it('DELETE /wiki/:id requires admin (BR-115)', async () => {
      if (userToken) {
        await request(app.getHttpServer())
          .delete(`/api/wiki/${createdPageId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      }
      await request(app.getHttpServer())
        .delete(`/api/wiki/${createdPageId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      createdPageId = null; // already deleted
    });
  });

  // ---------------------------------------------------------------------------
  // Task 11.4: Image upload happy path + rejections
  // ---------------------------------------------------------------------------
  describe('Wiki upload', () => {
    // Real PNG header bytes (8 bytes is enough for file-type to detect)
    const PNG_HEADER = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64),
    ]);
    const NOT_AN_IMAGE = Buffer.from('definitely not a png');

    it('rejects unauthenticated upload', async () => {
      await request(app.getHttpServer())
        .post('/api/wiki/upload')
        .attach('file', PNG_HEADER, { filename: 'a.png', contentType: 'image/png' })
        .expect(401);
    });

    it('rejects user-role upload', async () => {
      if (!userToken) return;
      await request(app.getHttpServer())
        .post('/api/wiki/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', PNG_HEADER, { filename: 'a.png', contentType: 'image/png' })
        .expect(403);
    });

    it('admin uploads PNG and gets a URL', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/wiki/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', PNG_HEADER, { filename: 'pic.png', contentType: 'image/png' })
        .expect(200);
      expect(res.body.data.url).toMatch(/^https?:\/\/.+\/wiki\/[a-f0-9-]+\.png$/);
      expect(res.body.data.mimeType).toBe('image/png');
    });

    it('rejects mime/content mismatch (text declared as png)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/wiki/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', NOT_AN_IMAGE, {
          filename: 'fake.png',
          contentType: 'image/png',
        })
        .expect(400);
      expect(res.body.message).toBe('wiki.upload_invalid_type');
    });

    it('rejects SVG outright', async () => {
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
      const res = await request(app.getHttpServer())
        .post('/api/wiki/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', svg, {
          filename: 'evil.svg',
          contentType: 'image/svg+xml',
        })
        .expect(400);
      expect(res.body.message).toBe('wiki.upload_invalid_type');
    });
  });
});
