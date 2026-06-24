# Wiki R2 Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move wiki image uploads from local disk to Cloudflare R2 and remove the local-disk implementation entirely.

**Architecture:** The `WIKI_STORAGE` DI token currently binds to `LocalDiskStorageService`. We add a `putObject` method to the existing `R2StorageService`, introduce `R2WikiStorageService` (implements the unchanged `WikiStorageService` interface), rebind the token to it, and delete the local-disk service plus its `/uploads` static route. The upload controller and frontend are unchanged — the API keeps returning `{ url, key, size }`.

**Tech Stack:** NestJS 11, `@aws-sdk/client-s3`, MikroORM, Jest.

## Global Constraints

- Backend code uses **relative imports** (no `@/*` alias in `server/`).
- Naming strategy is camelCase/PascalCase — irrelevant here (no new entity), but do not add `fieldName` overrides.
- Every backend test is `*.spec.ts` under `server/src/`, run with Jest from `server/`.
- Object key prefix for wiki images is `wiki/` (R2 has no directories; the prefix is part of the key).
- Public URL base resolution order: `R2_PUBLIC_BASE_URL` first, fall back to `R2_PUBLIC_DEV_URL`. Strip a trailing slash. This lets a future proxy swap the host via one env var with no code change.
- All commands below are run from `server/` unless stated otherwise.

---

### Task 1: Add `putObject` to `R2StorageService`

**Files:**
- Modify: `server/src/storage/r2-storage.service.ts`
- Test: `server/src/storage/r2-storage.service.spec.ts` (create)

**Interfaces:**
- Consumes: existing private `this.s3: S3Client`, `this.bucket: string`; `PutObjectCommand` (already imported).
- Produces: `async putObject(key: string, body: Buffer, contentType: string): Promise<void>` on `R2StorageService`.

- [ ] **Step 1: Write the failing test**

Create `server/src/storage/r2-storage.service.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from './r2-storage.service';
import { PutObjectCommand } from '@aws-sdk/client-s3';

function makeConfig(): ConfigService {
  const values: Record<string, string | number> = {
    R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    R2_ACCESS_KEY_ID: 'ak',
    R2_SECRET_ACCESS_KEY: 'sk',
    R2_BUCKET_NAME: 'bws',
    R2_SIGNED_URL_EXPIRES: 300,
  };
  return {
    get: (k: string, d?: unknown) => values[k] ?? d,
    getOrThrow: (k: string) => {
      if (values[k] === undefined) throw new Error(`missing ${k}`);
      return values[k];
    },
  } as unknown as ConfigService;
}

describe('R2StorageService.putObject', () => {
  it('sends a PutObjectCommand with bucket, key, body and content type', async () => {
    const svc = new R2StorageService(makeConfig());
    const send = jest
      .spyOn((svc as any).s3, 'send')
      .mockResolvedValue({} as never);
    const buf = Buffer.from([1, 2, 3]);

    await svc.putObject('wiki/abc.png', buf, 'image/png');

    expect(send).toHaveBeenCalledTimes(1);
    const cmd = send.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input).toMatchObject({
      Bucket: 'bws',
      Key: 'wiki/abc.png',
      Body: buf,
      ContentType: 'image/png',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- r2-storage.service`
Expected: FAIL — `svc.putObject is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `server/src/storage/r2-storage.service.ts`, add this method to the class (e.g. just before `deleteObject`):

```ts
  /**
   * Upload an object directly to R2 (server-side put, no presigned URL).
   */
  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
      }),
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- r2-storage.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/storage/r2-storage.service.ts server/src/storage/r2-storage.service.spec.ts
git commit -m "feat(storage): add putObject for server-side R2 uploads"
```

---

### Task 2: Add `R2WikiStorageService`

**Files:**
- Create: `server/src/wiki/services/r2-wiki-storage.service.ts`
- Test: `server/src/wiki/services/r2-wiki-storage.service.spec.ts` (create)

**Interfaces:**
- Consumes: `R2StorageService.putObject(key, body, contentType)` and `R2StorageService.deleteObject(key)` (Task 1 + existing); `ConfigService`; `MIME_EXT_MAP` from `../dto/wiki-constants`; `WikiStorageService` / `WikiStorageUploadInput` / `WikiStorageUploadResult` from `./wiki-storage.service`.
- Produces: `class R2WikiStorageService implements WikiStorageService` — `upload(input): Promise<{ url, key, size }>` with `key = "wiki/<uuid><ext>"`, `delete(key): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `server/src/wiki/services/r2-wiki-storage.service.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { R2WikiStorageService } from './r2-wiki-storage.service';
import { R2StorageService } from '../../storage/r2-storage.service';

function makeR2() {
  return {
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn().mockResolvedValue(undefined),
  } as unknown as R2StorageService;
}

function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (k: string) => values[k],
    getOrThrow: (k: string) => {
      if (values[k] === undefined) throw new Error(`missing ${k}`);
      return values[k];
    },
  } as unknown as ConfigService;
}

describe('R2WikiStorageService', () => {
  const base = 'https://pub-x.r2.dev';

  it('uploads with key wiki/<uuid>.png and returns public url + size', async () => {
    const r2 = makeR2();
    const svc = new R2WikiStorageService(
      r2,
      makeConfig({ R2_PUBLIC_DEV_URL: base }),
    );
    const buf = Buffer.from([0xff, 0xd8, 0xff]);

    const out = await svc.upload({
      buffer: buf,
      mimeType: 'image/png',
      originalName: 'icon.png',
    });

    expect(out.key).toMatch(/^wiki\/[a-f0-9-]+\.png$/);
    expect(out.url).toBe(`${base}/${out.key}`);
    expect(out.size).toBe(3);
    expect(r2.putObject).toHaveBeenCalledWith(out.key, buf, 'image/png');
  });

  it('uses .jpg extension for image/jpeg', async () => {
    const svc = new R2WikiStorageService(
      makeR2(),
      makeConfig({ R2_PUBLIC_DEV_URL: base }),
    );
    const out = await svc.upload({
      buffer: Buffer.from([0]),
      mimeType: 'image/jpeg',
      originalName: 'p.jpg',
    });
    expect(out.key.endsWith('.jpg')).toBe(true);
  });

  it('prefers R2_PUBLIC_BASE_URL and strips a trailing slash', async () => {
    const svc = new R2WikiStorageService(
      makeR2(),
      makeConfig({
        R2_PUBLIC_BASE_URL: 'https://cdn.example.com/',
        R2_PUBLIC_DEV_URL: base,
      }),
    );
    const out = await svc.upload({
      buffer: Buffer.from([0]),
      mimeType: 'image/png',
      originalName: 'x.png',
    });
    expect(out.url).toBe(`https://cdn.example.com/${out.key}`);
  });

  it('throws on unsupported mime type', async () => {
    const svc = new R2WikiStorageService(
      makeR2(),
      makeConfig({ R2_PUBLIC_DEV_URL: base }),
    );
    await expect(
      svc.upload({
        buffer: Buffer.from([0]),
        mimeType: 'image/heic',
        originalName: 'x.heic',
      }),
    ).rejects.toThrow('Unsupported mime type');
  });

  it('delete forwards the key to r2.deleteObject', async () => {
    const r2 = makeR2();
    const svc = new R2WikiStorageService(
      r2,
      makeConfig({ R2_PUBLIC_DEV_URL: base }),
    );
    await svc.delete('wiki/abc.png');
    expect(r2.deleteObject).toHaveBeenCalledWith('wiki/abc.png');
  });

  it('throws at construction when no public base url is configured', () => {
    expect(
      () => new R2WikiStorageService(makeR2(), makeConfig({})),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- r2-wiki-storage.service`
Expected: FAIL — cannot find module `./r2-wiki-storage.service`.

- [ ] **Step 3: Write minimal implementation**

Create `server/src/wiki/services/r2-wiki-storage.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { R2StorageService } from '../../storage/r2-storage.service';
import {
  WikiStorageService,
  WikiStorageUploadInput,
  WikiStorageUploadResult,
} from './wiki-storage.service';
import { MIME_EXT_MAP } from '../dto/wiki-constants';

@Injectable()
export class R2WikiStorageService implements WikiStorageService {
  private readonly publicBaseUrl: string;

  constructor(
    private readonly r2: R2StorageService,
    private readonly config: ConfigService,
  ) {
    const base =
      this.config.get<string>('R2_PUBLIC_BASE_URL') ??
      this.config.getOrThrow<string>('R2_PUBLIC_DEV_URL');
    this.publicBaseUrl = base.replace(/\/+$/, '');
  }

  async upload(
    input: WikiStorageUploadInput,
  ): Promise<WikiStorageUploadResult> {
    const ext = (MIME_EXT_MAP as Record<string, string>)[input.mimeType];
    if (!ext) throw new Error(`Unsupported mime type: ${input.mimeType}`);

    const key = `wiki/${randomUUID()}${ext}`;
    await this.r2.putObject(key, input.buffer, input.mimeType);

    return {
      url: `${this.publicBaseUrl}/${key}`,
      key,
      size: input.buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    await this.r2.deleteObject(key);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- r2-wiki-storage.service`
Expected: PASS (all 6 cases).

- [ ] **Step 5: Commit**

```bash
git add server/src/wiki/services/r2-wiki-storage.service.ts server/src/wiki/services/r2-wiki-storage.service.spec.ts
git commit -m "feat(wiki): add R2-backed wiki storage service"
```

---

### Task 3: Rebind `WIKI_STORAGE` and remove local disk

**Files:**
- Modify: `server/src/wiki/wiki.module.ts`
- Modify: `server/src/main.ts:6` and `server/src/main.ts:28-33`
- Delete: `server/src/wiki/services/local-disk-storage.service.ts`
- Delete: `server/src/wiki/services/local-disk-storage.service.spec.ts`

**Interfaces:**
- Consumes: `R2WikiStorageService` (Task 2), `StorageModule` (exports `R2StorageService`), `WIKI_STORAGE` token.
- Produces: nothing new — `WIKI_STORAGE` now resolves to `R2WikiStorageService`.

- [ ] **Step 1: Rewire the module**

Edit `server/src/wiki/wiki.module.ts`. Replace the `LocalDiskStorageService` import (line 12) with:

```ts
import { StorageModule } from '../storage/storage.module';
import { R2WikiStorageService } from './services/r2-wiki-storage.service';
```

Add `StorageModule` to `imports`:

```ts
  imports: [
    MikroOrmModule.forFeature([WikiPage, WikiRevision, AuditLog, FileAsset, User]),
    StorageModule,
  ],
```

Change the provider binding:

```ts
    {
      provide: WIKI_STORAGE,
      useClass: R2WikiStorageService,
    },
```

- [ ] **Step 2: Remove the static `/uploads` route**

Edit `server/src/main.ts`. Delete lines 28-33 (the `config`/`uploadDirRaw`/`uploadDir`/`useStaticAssets` block). Then change the import on line 6 from:

```ts
import { join, isAbsolute } from 'node:path';
```

to (it is no longer used anywhere — remove the line entirely). Verify no other usage:

Run: `grep -nE "isAbsolute|join\(" server/src/main.ts`
Expected: no output.

Note: keep `NestExpressApplication` as the generic type on `NestFactory.create` — leaving it is harmless and avoids churn.

- [ ] **Step 3: Delete the local-disk files**

```bash
git rm server/src/wiki/services/local-disk-storage.service.ts server/src/wiki/services/local-disk-storage.service.spec.ts
```

- [ ] **Step 4: Build and run the full backend test suite**

Run: `npm run build`
Expected: build succeeds, no TS errors (confirms the removed import and rebinding compile).

Run: `npm test`
Expected: PASS — no references to `LocalDiskStorageService` remain; R2 specs pass.

If any test still imports `LocalDiskStorageService`, that import must be removed/updated — search with `grep -rn "LocalDiskStorageService" server/src` and expect no output.

- [ ] **Step 5: Commit**

```bash
git add server/src/wiki/wiki.module.ts server/src/main.ts
git commit -m "refactor(wiki): bind WIKI_STORAGE to R2 and drop local disk storage"
```

---

### Task 4: Update env reference

**Files:**
- Modify: `server/.env.example`

**Interfaces:**
- Consumes: nothing.
- Produces: documented `R2_PUBLIC_BASE_URL` env var; removed dead local-upload vars.

- [ ] **Step 1: Edit `server/.env.example`**

Remove these two lines (now unused after Task 3):

```
WIKI_UPLOAD_BASE_URL=http://localhost:3001
WIKI_UPLOAD_DIR=uploads
```

Keep `WIKI_UPLOAD_MAX_SIZE=5242880` (still read by the upload validation).

Below the existing R2 block, add:

```
# Optional: overrides R2_PUBLIC_DEV_URL as the public base for wiki image URLs.
# Set this to a proxy/CDN host later to hide the true R2 URL — no code change needed.
R2_PUBLIC_BASE_URL=
```

- [ ] **Step 2: Sanity check the dev `.env`**

Confirm the running backend has a public base resolvable. Run:

```bash
grep -E "R2_PUBLIC_DEV_URL|R2_PUBLIC_BASE_URL|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY" server/.env
```

Expected: `R2_PUBLIC_DEV_URL` is set, and R2 access key + secret are non-empty (required for real uploads). If access key/secret are blank, note it — uploads will fail at runtime until they are filled in (not a code issue).

- [ ] **Step 3: Commit**

```bash
git add server/.env.example
git commit -m "docs(env): document R2_PUBLIC_BASE_URL, drop local upload vars"
```

---

## Self-Review notes

- **Spec coverage:** putObject (Task 1) ✓; R2WikiStorageService incl. base-url precedence + trailing-slash + fail-fast (Task 2) ✓; module rebind + StorageModule import (Task 3) ✓; remove local disk service/spec + static route (Task 3) ✓; env changes (Task 4) ✓; frontend unchanged (no task — `next.config.ts` already allowlists `pub-*.r2.dev`) ✓; controller unchanged (verified `stored.key`/`stored.url` semantics hold) ✓.
- **Key format change:** local disk stored `key = "<uuid>.png"` and built URL with `/uploads/wiki/` prefix; R2 stores `key = "wiki/<uuid>.png"` and URL is `base + "/" + key`. Net public path shape differs but the controller persists whatever `{url,key}` the service returns, so no consumer breaks. Old local-disk assets are not migrated (none in R2); acceptable per scope C (greenfield bucket).
- **Type consistency:** `putObject(key, body, contentType)` used identically in Task 1 def and Task 2 call; `deleteObject(key)` matches existing signature.
