# Wiki R2 Storage — Design

Date: 2026-06-19
Scope: C (swap wiki image storage to Cloudflare R2, remove local disk entirely)

## Goal

Wiki image uploads currently write to local disk (`LocalDiskStorageService`) and are
served via `/uploads/*` static route. Move them to Cloudflare R2. Remove the local disk
implementation and its static serving. The API returns the public URL; the frontend
renders whatever URL the API returns — no domain hardcoded on the client, so a future
proxy can hide the true R2 URL by changing one env var.

## Architecture

Keep the existing `WikiStorageService` interface (DI token `WIKI_STORAGE`) and the
server-side upload flow (buffer travels through backend, magic-byte validated by
`validateUploadOrThrow`). Only the implementation behind `WIKI_STORAGE` changes.

### 1. `R2StorageService` — add `putObject`

`server/src/storage/r2-storage.service.ts` today only does presigned PUT/GET (private
download bucket). Wiki uploads server-side, so add a direct put:

```ts
async putObject(key: string, body: Buffer, contentType: string): Promise<void>
```

Uses `PutObjectCommand` (already imported) with `Bucket`, `Key`, `Body`, `ContentType`.

### 2. New `R2WikiStorageService implements WikiStorageService`

Location: `server/src/wiki/services/r2-wiki-storage.service.ts`. Injects
`R2StorageService` + `ConfigService`.

- `upload(input)`:
  - `ext = MIME_EXT_MAP[input.mimeType]` (throw on unsupported).
  - `key = "wiki/${randomUUID()}${ext}"`.
  - `await r2.putObject(key, input.buffer, input.mimeType)`.
  - returns `{ url: `${publicBaseUrl}/${key}`, key, size: input.buffer.length }`.
- `delete(key)`: `await r2.deleteObject(key)`.
- `publicBaseUrl`: `config.get('R2_PUBLIC_BASE_URL') ?? config.getOrThrow('R2_PUBLIC_DEV_URL')`,
  trailing slash stripped. Swapping to a proxy later = set `R2_PUBLIC_BASE_URL`, nothing else.

### 3. `wiki.module.ts`

- `import { StorageModule }` and add to `imports`.
- Bind `WIKI_STORAGE → R2WikiStorageService`.
- Remove `LocalDiskStorageService` import + provider.

### 4. Remove local disk (scope C)

- Delete `server/src/wiki/services/local-disk-storage.service.ts` and its `.spec.ts`.
- `main.ts`: remove the `useStaticAssets(uploadDir, { prefix: '/uploads' })` block and the
  `uploadDir` computation (lines ~28-33).
- `.env.example` (server): remove `WIKI_UPLOAD_DIR`, `WIKI_UPLOAD_BASE_URL`; keep
  `WIKI_UPLOAD_MAX_SIZE`. Add `R2_PUBLIC_BASE_URL` (commented/empty — optional override).

## Data semantics (unchanged)

`wiki-upload.controller.ts` persists `FileAsset.fileVersion = stored.key`,
`filePath = stored.url`. With R2: `key = "wiki/{uuid}.png"`, `url = public URL`. Controller
needs no change. Compensating `storage.delete(stored.key)` on DB-persist failure still works
(now deletes from R2).

## Frontend

No change. `next.config.ts` already allowlists `pub-...r2.dev` for `next/image`. FE renders
the API-returned URL.

## Error handling

- Missing `R2_PUBLIC_DEV_URL` (and no `R2_PUBLIC_BASE_URL`) → service init throws (fail-fast).
- R2 missing core creds → `R2StorageService` ctor already `getOrThrow`s.
- Upload OK but DB persist fails → existing compensating delete removes the R2 object.

## Testing

- Add `r2-wiki-storage.service.spec.ts`: mock `R2StorageService` + `ConfigService`; assert
  key format `wiki/<uuid>.<ext>`, URL = `base + '/' + key` (trailing slash handled),
  unsupported mime throws, `delete` passes key through to `r2.deleteObject`.
- Delete `local-disk-storage.service.spec.ts`.
- Run `npm test` (server) + `npm run build` (server) to verify.
