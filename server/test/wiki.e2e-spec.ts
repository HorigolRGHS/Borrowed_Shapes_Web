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

  // Tests added in subsequent tasks.
});
