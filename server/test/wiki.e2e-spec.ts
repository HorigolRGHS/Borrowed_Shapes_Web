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
import { join } from 'node:path';
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
    app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
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
});
