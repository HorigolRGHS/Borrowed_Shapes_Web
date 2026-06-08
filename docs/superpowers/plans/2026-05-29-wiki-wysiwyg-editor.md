# Wiki WYSIWYG Editor Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hợp nhất trang create/edit wiki thành WYSIWYG editor inline khớp public layout 2-cột, gộp metadata vào revision snapshot, bỏ wizard create.

**Architecture:** Tách layout primitives (`WikiPageShell`, `WikiPageHeader`, `WikiInfoboxCard`) dùng chung view + edit, mỗi component có 2 mode. Edit mode wrap mỗi field metadata trong inline editor (click-to-edit). `WikiRevision` mở rộng để snapshot toàn bộ trạng thái Wiki tại save time. Bỏ trang `/dashboard/wiki/new`, thay bằng stub create + redirect.

**Tech Stack:** Next.js 16 App Router, React 19, react-hook-form + zod, TipTap v3 (markdown), shadcn/ui, NestJS 11, MikroORM (PostgreSQL), Jest.

**Spec:** [docs/superpowers/specs/2026-05-29-wiki-wysiwyg-editor-design.md](../specs/2026-05-29-wiki-wysiwyg-editor-design.md)

**Phase order (tasks numbered globally):**
- Phase 1 — Backend revision snapshot (Tasks 1–5)
- Phase 2 — Stub create endpoint (Tasks 6–8)
- Phase 3 — Layout primitives (Tasks 9–12)
- Phase 4 — Inline edit components (Tasks 13–19)
- Phase 5 — Refactor edit page (Tasks 20–22)
- Phase 6 — Stub create flow on list + cleanup (Tasks 23–25)
- Phase 7 — History UI mở rộng (Tasks 26–28)
- Phase 8 — Polish & QA (Task 29)

---

## Phase 1 — Backend revision snapshot

Mở rộng `WikiRevision` để snapshot toàn bộ trạng thái Wiki (title, slug, metadata, isPublished). Migration nullable trước, backfill, set NOT NULL. Sửa `WikiRevisionService.update()` ghi đầy đủ vào revision mới và `rollback()` apply đầy đủ.

### Task 1: Add snapshot columns to WikiRevision entity (nullable)

**Files:**
- Modify: `server/src/entities/WikiRevision.ts`

- [ ] **Step 1: Add nullable snapshot fields**

```ts
// In WikiRevision class, after summary_vi property, add:

  @Property({ type: 'text', nullable: true })
  title?: string;

  @Property({ type: 'text', nullable: true })
  title_vi?: string;

  @Property({ type: 'text', nullable: true })
  slug?: string;

  @Property({ type: 'text', nullable: true })
  slug_vi?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadataJson?: Record<string, unknown>;

  @Property({ type: 'boolean', nullable: true })
  isPublished?: boolean;
```

- [ ] **Step 2: Generate migration**

Run from `server/`:
```bash
npm run orm:migration:create -- --name add-wiki-revision-snapshot-fields
```
Expected: a new file `server/migrations/Migration<timestamp>.ts` containing `ALTER TABLE web."WikiRevision" ADD COLUMN ...` for the six new fields.

- [ ] **Step 3: Inspect the generated migration**

Open the new file. It should contain `up()` adding columns and `down()` dropping them. If the generator missed any column, hand-edit it to match the entity changes from Step 1.

- [ ] **Step 4: Commit**

```bash
git add server/src/entities/WikiRevision.ts server/migrations/
git commit -m "feat(wiki): add nullable snapshot columns to WikiRevision"
```

---

### Task 2: Backfill snapshot from current Wiki state

**Files:**
- Create: `server/migrations/Migration<timestamp+1>-backfill-wiki-revision-snapshot.ts`

- [ ] **Step 1: Generate empty migration**

```bash
npm run orm:migration:create -- --name backfill-wiki-revision-snapshot --blank
```
Expected: a new file with empty `up()` / `down()`.

- [ ] **Step 2: Write backfill SQL in the generated file**

Replace the content of the generated file with:
```ts
import { Migration } from '@mikro-orm/migrations';

export class MigrationBackfillWikiRevisionSnapshot extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      UPDATE web."WikiRevision" r
      SET
        "title" = w."title",
        "title_vi" = w."title_vi",
        "slug" = w."slug",
        "slug_vi" = w."slug_vi",
        "metadataJson" = w."metadataJson",
        "isPublished" = w."isPublished"
      FROM web."WikiPage" w
      WHERE r."pageId" = w."id"
        AND r."title" IS NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      UPDATE web."WikiRevision"
      SET
        "title" = NULL,
        "title_vi" = NULL,
        "slug" = NULL,
        "slug_vi" = NULL,
        "metadataJson" = NULL,
        "isPublished" = NULL;
    `);
  }
}
```

(Keep the actual class name from the generator — only replace the body.)

- [ ] **Step 3: Apply migrations to dev DB**

```bash
npm run orm:migration:up
```
Expected: both migrations run successfully. Verify in psql:
```sql
SELECT id, title, slug, "isPublished" FROM web."WikiRevision" LIMIT 5;
```
All rows should have non-null `title` and `slug`.

- [ ] **Step 4: Commit**

```bash
git add server/migrations/
git commit -m "feat(wiki): backfill WikiRevision snapshot fields from WikiPage"
```

---

### Task 3: Make snapshot columns NOT NULL (except metadataJson)

**Files:**
- Modify: `server/src/entities/WikiRevision.ts`
- Create: `server/migrations/Migration<timestamp+2>-tighten-wiki-revision-snapshot.ts`

- [ ] **Step 1: Update entity to require fields**

In `WikiRevision.ts`, change the four text/bool fields to non-optional (keep `metadataJson` optional):

```ts
  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  title_vi!: string;

  @Property({ type: 'text' })
  slug!: string;

  @Property({ type: 'text' })
  slug_vi!: string;

  @Property({ type: 'jsonb', nullable: true })
  metadataJson?: Record<string, unknown>;

  @Property({ type: 'boolean', default: false })
  isPublished!: boolean;
```

- [ ] **Step 2: Generate migration**

```bash
npm run orm:migration:create -- --name tighten-wiki-revision-snapshot
```
Expected: file with `ALTER COLUMN ... SET NOT NULL` for the five fields.

- [ ] **Step 3: Apply and verify**

```bash
npm run orm:migration:up
```
Expected: success. Verify with:
```sql
\d+ web."WikiRevision"
```
Confirm `title`, `title_vi`, `slug`, `slug_vi`, `isPublished` are NOT NULL.

- [ ] **Step 4: Commit**

```bash
git add server/src/entities/WikiRevision.ts server/migrations/
git commit -m "feat(wiki): set NOT NULL on WikiRevision snapshot fields after backfill"
```

---

### Task 4: Update WikiRevisionService to write full snapshot

**Files:**
- Modify: `server/src/wiki/services/wiki-revision.service.ts:99-235` (the `update()` method)
- Modify: `server/src/wiki/services/wiki-revision.service.ts:41-97` (the `create()` method)
- Test: `server/src/wiki/services/wiki-revision.service.spec.ts`

- [ ] **Step 1: Write failing test for snapshot on update**

Add this test to `wiki-revision.service.spec.ts` inside an existing `describe` block for update (or create one):

```ts
describe('WikiRevisionService.update writes full snapshot', () => {
  it('persists title/slug/metadata/isPublished onto the new revision', async () => {
    const transactionalImpl = async (cb: any) => cb(em);
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
    em.create = jest.fn((_e, data) => {
      const obj = { ...data, id: 'r2' };
      created.push(obj);
      return obj;
    });
    em.flush = jest.fn().mockResolvedValue(undefined);
    em.transactional = jest.fn(transactionalImpl);
    em.getReference = jest.fn((_e, id) => ({ id }));

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
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd server && npm test -- wiki-revision.service
```
Expected: FAIL — new fields undefined on the created revision.

- [ ] **Step 3: Modify update() to include snapshot in revision create**

In `wiki-revision.service.ts`, locate the `em.create(WikiRevision, ...)` block inside `update()` (around line 186) and replace it with:

```ts
        const newRevision = em.create(WikiRevision, {
          pageId: page,
          authorId: em.getReference(User, adminUserId),
          content: dto.content,
          content_vi: dto.content_vi,
          summary: dto.summary ?? null,
          summary_vi: dto.summary_vi ?? null,
          title: dto.title,
          title_vi: dto.title_vi,
          slug: dto.slug,
          slug_vi: dto.slug_vi,
          metadataJson: compactMetadata(dto.metadataJson),
          isPublished: dto.isPublished ?? page.isPublished,
        } as any);
```

Also, update the "totalNoop" decision: previously a metadata-only change would skip revision creation. With snapshot model, **every save creates a revision** when content OR metadata changed. Replace the noop branch:

```ts
      if (!contentChanged && metadataDiff.length === 0) {
        return {
          pageId: page.id,
          fromRevisionId: currentLatestId,
          toRevisionId: currentLatestId,
          totalNoop: true,
          metadataDiff,
          publishStateChanged,
          forceOverwriteApplied,
        };
      }
```
Keep this branch as-is (true noop = nothing changed).

Then, **always create a revision** when something changed (content OR metadata). Replace the `if (contentChanged) { ... }` block with:

```ts
      const newRevision = em.create(WikiRevision, {
        pageId: page,
        authorId: em.getReference(User, adminUserId),
        content: dto.content,
        content_vi: dto.content_vi,
        summary: dto.summary ?? null,
        summary_vi: dto.summary_vi ?? null,
        title: dto.title,
        title_vi: dto.title_vi,
        slug: dto.slug,
        slug_vi: dto.slug_vi,
        metadataJson: compactMetadata(dto.metadataJson),
        isPublished: dto.isPublished ?? page.isPublished,
      } as any);
      await em.flush();
      page.latestRevisionId = newRevision;
      const newRevisionId: string = newRevision.id;
```

(Replace the previous `let newRevisionId: string | null = currentLatestId; if (contentChanged) { ... }` pattern.)

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- wiki-revision.service
```
Expected: PASS for the new test, and existing tests still pass.

- [ ] **Step 5: Update create() to write snapshot too**

In `WikiRevisionService.create()` around line 65, change the revision creation to:

```ts
      const revision = em.create(WikiRevision, {
        pageId: page,
        authorId: em.getReference(User, adminUserId),
        content: dto.content,
        content_vi: dto.content_vi,
        summary: dto.summary ?? null,
        summary_vi: dto.summary_vi ?? null,
        title: dto.title,
        title_vi: dto.title_vi,
        slug: dto.slug,
        slug_vi: dto.slug_vi,
        metadataJson: compactMetadata(dto.metadataJson),
        isPublished: dto.isPublished ?? false,
      } as any);
```

- [ ] **Step 6: Re-run tests**

```bash
npm test -- wiki-revision.service
```
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/wiki/services/wiki-revision.service.ts server/src/wiki/services/wiki-revision.service.spec.ts
git commit -m "feat(wiki): write full snapshot on every WikiRevision create/update"
```

---

### Task 5: Update rollback to apply full snapshot + history DTO exposes fields

**Files:**
- Modify: `server/src/wiki/services/wiki-revision.service.ts:237-315` (rollback method)
- Modify: `server/src/wiki/dto/wiki-history.dto.ts`
- Modify: `server/src/wiki/services/wiki.service.ts:323-333` (toDetailRevision) and `:255-262` (toListItem-like history mapping)
- Test: `server/src/wiki/services/wiki-revision.service.spec.ts`

- [ ] **Step 1: Add a failing test for rollback applying snapshot**

Add to `wiki-revision.service.spec.ts`:

```ts
describe('WikiRevisionService.rollback applies full snapshot', () => {
  it('restores title/slug/metadata/isPublished from target revision', async () => {
    const transactionalImpl = async (cb: any) => cb(em);
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
    em.create = jest.fn((_e, data) => {
      const obj = { ...data, id: 'r4' };
      created.push(obj);
      return obj;
    });
    em.flush = jest.fn().mockResolvedValue(undefined);
    em.transactional = jest.fn(transactionalImpl);
    em.getReference = jest.fn((_e, id) => ({ id }));

    await service.rollback(
      'p1',
      { targetRevisionId: 'r2', expectedLatestRevisionId: 'r3' } as any,
      'admin-1',
      '127.0.0.1',
    );

    const restored = created.find((c) => c.id === 'r4');
    expect(restored.title).toBe('Old');
    expect(restored.slug).toBe('old-slug');
    expect(restored.metadataJson).toEqual({ category: 'Boss' });
    expect(restored.isPublished).toBe(false);
    expect(page.title).toBe('Old');
    expect(page.slug).toBe('old-slug');
    expect(page.metadataJson).toEqual({ category: 'Boss' });
    expect(page.isPublished).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd server && npm test -- wiki-revision.service
```
Expected: FAIL — rollback currently only restores content.

- [ ] **Step 3: Update rollback to restore full snapshot**

In `wiki-revision.service.ts`, locate the `rollback()` method (line ~237). Replace the new-revision creation block (line ~276) with:

```ts
      const newRevision = em.create(WikiRevision, {
        pageId: page,
        authorId: em.getReference(User, adminUserId),
        content: target.content,
        content_vi: target.content_vi,
        summary: `Rollback to revision ${target.id} (created ${target.createdAt.toISOString()})`,
        summary_vi: `Khôi phục về phiên bản ${target.id} (tạo ${target.createdAt.toISOString()})`,
        title: target.title,
        title_vi: target.title_vi,
        slug: target.slug,
        slug_vi: target.slug_vi,
        metadataJson: target.metadataJson ?? null,
        isPublished: target.isPublished,
      } as any);
      await em.flush();

      page.latestRevisionId = newRevision;
      page.slug = target.slug;
      page.slug_vi = target.slug_vi;
      page.title = target.title;
      page.title_vi = target.title_vi;
      page.metadataJson = target.metadataJson ?? null;
      page.isPublished = target.isPublished;
      await em.flush();
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- wiki-revision.service
```
Expected: PASS.

- [ ] **Step 5: Extend WikiHistoryItemDto with snapshot fields**

Replace `WikiHistoryItemDto` in `server/src/wiki/dto/wiki-history.dto.ts`:

```ts
export class WikiHistoryItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  title_vi!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  slug_vi!: string;

  @ApiProperty({ nullable: true, type: Object })
  metadataJson!: Record<string, unknown> | null;

  @ApiProperty()
  isPublished!: boolean;

  @ApiProperty({ nullable: true, type: String })
  summary!: string | null;

  @ApiProperty({ nullable: true, type: String })
  summary_vi!: string | null;

  @ApiProperty({ nullable: true, type: WikiAuthorDto })
  author!: WikiAuthorDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  isLatest!: boolean;
}
```

Also extend `WikiDetailRevisionDto` similarly. Open `server/src/wiki/dto/wiki-detail.dto.ts` and add the same six fields (`title`, `title_vi`, `slug`, `slug_vi`, `metadataJson`, `isPublished`) to the revision DTO class.

- [ ] **Step 6: Update mappers in WikiService**

In `server/src/wiki/services/wiki.service.ts`:

Replace `toDetailRevision` (line ~323):

```ts
  private toDetailRevision(rev: WikiRevision): WikiDetailRevisionDto {
    return {
      id: rev.id,
      content: rev.content,
      content_vi: rev.content_vi,
      summary: rev.summary ?? null,
      summary_vi: rev.summary_vi ?? null,
      title: rev.title,
      title_vi: rev.title_vi,
      slug: rev.slug,
      slug_vi: rev.slug_vi,
      metadataJson: (rev.metadataJson as Record<string, unknown> | undefined) ?? null,
      isPublished: rev.isPublished,
      author: this.toAuthor(rev.authorId),
      createdAt: rev.createdAt,
    };
  }
```

In `getHistory()` (line ~255), replace the items mapping:

```ts
    const items: WikiHistoryItemDto[] = revisions.map((r) => ({
      id: r.id,
      title: r.title,
      title_vi: r.title_vi,
      slug: r.slug,
      slug_vi: r.slug_vi,
      metadataJson: (r.metadataJson as Record<string, unknown> | undefined) ?? null,
      isPublished: r.isPublished,
      summary: r.summary ?? null,
      summary_vi: r.summary_vi ?? null,
      author: this.toAuthor(r.authorId),
      createdAt: r.createdAt,
      isLatest: r.id === latestId,
    }));
```

Also update `toDetail` (line ~152) and the create-detail revision block (~154-162) to include the new fields:

```ts
    const detailRev: WikiDetailRevisionDto = {
      id: rev.id,
      content: rev.content,
      content_vi: rev.content_vi,
      summary: rev.summary ?? null,
      summary_vi: rev.summary_vi ?? null,
      title: rev.title,
      title_vi: rev.title_vi,
      slug: rev.slug,
      slug_vi: rev.slug_vi,
      metadataJson: (rev.metadataJson as Record<string, unknown> | undefined) ?? null,
      isPublished: rev.isPublished,
      author: this.toAuthor(rev.authorId),
      createdAt: rev.createdAt,
    };
```

- [ ] **Step 7: Run all backend tests**

```bash
cd server && npm test
```
Expected: PASS across the suite. If any DTO type test fails, fix the type imports.

- [ ] **Step 8: Commit**

```bash
git add server/src/wiki/services/wiki-revision.service.ts server/src/wiki/services/wiki-revision.service.spec.ts server/src/wiki/services/wiki.service.ts server/src/wiki/dto/wiki-history.dto.ts server/src/wiki/dto/wiki-detail.dto.ts
git commit -m "feat(wiki): rollback applies full snapshot; expose snapshot in history/detail"
```

---

## Phase 2 — Stub create endpoint

Backend nhận `{ stub: true }` thay cho payload đầy đủ và tự sinh placeholder. Frontend có helper `createWikiStub()`.

### Task 6: Add `stub` mode to WikiCreateRequestDto

**Files:**
- Modify: `server/src/wiki/dto/wiki-create.dto.ts`

- [ ] **Step 1: Make existing required fields optional when `stub` is true**

Replace the body of `WikiCreateRequestDto` with:

```ts
export class WikiCreateRequestDto {
  @ApiPropertyOptional({ description: 'When true, server generates placeholders for all fields' })
  @IsOptional()
  @IsBoolean()
  stub?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Validate(WikiSlugConstraint)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Validate(WikiSlugConstraint)
  slug_vi?: string;

  @ApiPropertyOptional({ maxLength: WIKI_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_TITLE_MAX_LENGTH)
  title?: string;

  @ApiPropertyOptional({ maxLength: WIKI_TITLE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_TITLE_MAX_LENGTH)
  title_vi?: string;

  @ApiPropertyOptional({ maxLength: WIKI_CONTENT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_CONTENT_MAX_LENGTH)
  content?: string;

  @ApiPropertyOptional({ maxLength: WIKI_CONTENT_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_CONTENT_MAX_LENGTH)
  content_vi?: string;

  @ApiPropertyOptional({ maxLength: WIKI_SUMMARY_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_SUMMARY_MAX_LENGTH)
  summary?: string;

  @ApiPropertyOptional({ maxLength: WIKI_SUMMARY_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(WIKI_SUMMARY_MAX_LENGTH)
  summary_vi?: string;

  @ApiPropertyOptional({ type: WikiMetadataDto, nullable: true })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WikiMetadataDto)
  metadataJson?: WikiMetadataDto | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
```

The DTO becomes permissive at the class-validator layer. Service layer enforces non-stub completeness (next task).

- [ ] **Step 2: Commit**

```bash
git add server/src/wiki/dto/wiki-create.dto.ts
git commit -m "feat(wiki): allow stub create — make fields optional in DTO"
```

---

### Task 7: WikiRevisionService.create handles stub mode

**Files:**
- Modify: `server/src/wiki/services/wiki-revision.service.ts:41-97` (create method)
- Test: `server/src/wiki/services/wiki-revision.service.spec.ts`

- [ ] **Step 1: Write failing tests for stub create**

Add a new describe block to `wiki-revision.service.spec.ts`:

```ts
describe('WikiRevisionService.create stub mode', () => {
  it('generates placeholder slug/title when stub=true', async () => {
    const transactionalImpl = async (cb: any) => cb(em);
    const created: any[] = [];
    em.create = jest.fn((_e, data) => {
      const obj = { ...data, id: data.id ?? `id-${created.length}` };
      created.push(obj);
      return obj;
    });
    em.flush = jest.fn().mockResolvedValue(undefined);
    em.transactional = jest.fn(transactionalImpl);
    em.getReference = jest.fn((_e, id) => ({ id }));
    wikiSvc.getByIdForAdmin = jest.fn().mockResolvedValue({ id: 'p1' } as any);

    await service.create({ stub: true } as any, 'admin-1', '127.0.0.1');

    const page = created.find((c) => c.slug);
    expect(page).toBeDefined();
    expect(page.slug).toMatch(/^untitled-[a-z0-9]{6}$/);
    expect(page.slug_vi).toMatch(/^khong-ten-[a-z0-9]{6}$/);
    expect(page.title).toBe('');
    expect(page.title_vi).toBe('');
    expect(page.isPublished).toBe(false);
  });

  it('rejects non-stub payload missing required fields', async () => {
    await expect(
      service.create({} as any, 'admin-1', '127.0.0.1'),
    ).rejects.toThrow('wiki.invalid_input');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd server && npm test -- wiki-revision.service
```
Expected: FAIL — service has no stub branch yet.

- [ ] **Step 3: Add stub helper at top of service file**

In `wiki-revision.service.ts`, after the imports, add:

```ts
function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function buildStubInput(dto: WikiCreateRequestDto): Required<Pick<WikiCreateRequestDto, 'slug' | 'slug_vi' | 'title' | 'title_vi' | 'content' | 'content_vi' | 'isPublished'>> {
  return {
    slug: `untitled-${randomSlugSuffix()}`,
    slug_vi: `khong-ten-${randomSlugSuffix()}`,
    title: '',
    title_vi: '',
    content: '',
    content_vi: '',
    isPublished: false,
  };
}
```

- [ ] **Step 4: Modify create() to branch on stub**

Replace the body of `WikiRevisionService.create()`:

```ts
  async create(
    dto: WikiCreateRequestDto,
    adminUserId: string,
    ipAddress: string,
  ): Promise<WikiDetailResponseDto> {
    let effective: WikiCreateRequestDto;
    if (dto.stub === true) {
      const stub = buildStubInput(dto);
      effective = { ...stub, metadataJson: null, summary: null, summary_vi: null } as WikiCreateRequestDto;
    } else {
      if (!dto.slug || !dto.slug_vi || !dto.title || !dto.title_vi || dto.content === undefined || dto.content_vi === undefined) {
        throw new BadRequestException('wiki.invalid_input');
      }
      effective = dto;
    }

    validateSlugOrThrow(effective.slug!);
    validateSlugOrThrow(effective.slug_vi!);

    const tryCreate = async (input: WikiCreateRequestDto) =>
      this.em.transactional(async (em) => {
        const page = em.create(WikiPage, {
          slug: input.slug!,
          slug_vi: input.slug_vi!,
          title: input.title!,
          title_vi: input.title_vi!,
          metadataJson: compactMetadata(input.metadataJson),
          isPublished: input.isPublished ?? false,
        } as any);
        try {
          await em.flush();
        } catch (err) {
          if (isWikiSlugUniqueError(err)) throw new ConflictException('wiki.slug_taken');
          throw err;
        }

        const revision = em.create(WikiRevision, {
          pageId: page,
          authorId: em.getReference(User, adminUserId),
          content: input.content ?? '',
          content_vi: input.content_vi ?? '',
          summary: input.summary ?? null,
          summary_vi: input.summary_vi ?? null,
          title: input.title!,
          title_vi: input.title_vi!,
          slug: input.slug!,
          slug_vi: input.slug_vi!,
          metadataJson: compactMetadata(input.metadataJson),
          isPublished: input.isPublished ?? false,
        } as any);
        await em.flush();

        page.latestRevisionId = revision;
        await em.flush();

        return { pageId: page.id, revisionId: revision.id };
      });

    let result: { pageId: string; revisionId: string } | undefined;
    let attempts = 0;
    const maxRetry = dto.stub === true ? 3 : 1;
    while (attempts < maxRetry) {
      try {
        result = await tryCreate(effective);
        break;
      } catch (err) {
        if (dto.stub === true && err instanceof ConflictException) {
          attempts++;
          if (attempts >= maxRetry) throw err;
          const stub = buildStubInput(dto);
          effective = { ...effective, slug: stub.slug, slug_vi: stub.slug_vi };
          continue;
        }
        throw err;
      }
    }
    if (!result) throw new ConflictException('wiki.slug_taken');

    await this.audit.log({
      userId: adminUserId,
      actionType: AuditActionType.CREATE,
      entityName: 'WikiPage',
      entityId: result.pageId,
      newValue: {
        slug: effective.slug,
        slug_vi: effective.slug_vi,
        title: effective.title,
        title_vi: effective.title_vi,
        firstRevisionId: result.revisionId,
        stub: dto.stub === true,
      },
      ipAddress,
    });

    return this.wikiService.getByIdForAdmin(result.pageId);
  }
```

- [ ] **Step 5: Run test to confirm pass**

```bash
npm test -- wiki-revision.service
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/wiki/services/wiki-revision.service.ts server/src/wiki/services/wiki-revision.service.spec.ts
git commit -m "feat(wiki): WikiRevisionService.create supports stub mode with slug retry"
```

---

### Task 8: Frontend api helper for stub create

**Files:**
- Modify: `lib/wiki/api.ts`

- [ ] **Step 1: Locate the existing createWiki function**

Open `lib/wiki/api.ts` and find `createWiki` (it should POST to `/wiki`). Confirm it exists and accepts a payload.

- [ ] **Step 2: Add createWikiStub helper**

Below the existing `createWiki` function, add:

```ts
export async function createWikiStub(): Promise<WikiDetail> {
  const res = await apiClient.post<ApiResponse<WikiDetail>>('/wiki', { stub: true });
  return res.data.data!;
}
```

If the file does not already import `WikiDetail` and `ApiResponse`, ensure those imports exist alongside the existing `createWiki` imports.

- [ ] **Step 3: Manual smoke test**

Start backend and frontend (`npm run dev` from root). In a browser console on a logged-in admin page:

```js
fetch('/api/wiki', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stub: true }),
  credentials: 'include',
}).then(r => r.json()).then(console.log);
```

Expected: response with `data.id`, `data.slug` matching `untitled-xxxxxx`, `data.title === ""`.

- [ ] **Step 4: Commit**

```bash
git add lib/wiki/api.ts
git commit -m "feat(wiki): add createWikiStub helper"
```

---

## Phase 3 — Layout primitives

Tách `WikiPageShell`, `WikiPageHeader`, refactor `WikiInfobox` thành readonly cells reusable. View page (`/wiki/[slug]`) chuyển sang dùng layout mới — visual không đổi.

### Task 9: Create WikiPageShell layout component

**Files:**
- Create: `components/wiki/wiki-page-shell.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from "react";

interface Props {
  header: ReactNode;
  body: ReactNode;
  infobox?: ReactNode;
  toc?: ReactNode;
}

export function WikiPageShell({ header, body, infobox, toc }: Props) {
  return (
    <div className="flex gap-8">
      <div className="flex-1 min-w-0">
        {infobox && <div className="lg:hidden mb-6">{infobox}</div>}
        {header}
        {body}
      </div>
      {(infobox || toc) && (
        <aside className="hidden w-72 shrink-0 lg:block">
          {infobox && <div className="sticky top-24 space-y-4">{infobox}</div>}
          {toc && <div className="mt-4">{toc}</div>}
        </aside>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/wiki/wiki-page-shell.tsx
git commit -m "feat(wiki): add WikiPageShell layout component"
```

---

### Task 10: Create WikiPageHeader with view mode

**Files:**
- Create: `components/wiki/wiki-page-header.tsx`

- [ ] **Step 1: Write the component (view mode only for now; edit mode added in Phase 5)**

```tsx
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

interface ViewProps {
  mode: "view";
  title: string;
  summary?: string | null;
  byline?: ReactNode;
  isDraft?: boolean;
  draftLabel?: string;
}

interface EditProps {
  mode: "edit";
  titleNode: ReactNode;
  summaryNode: ReactNode;
  toolbarNode?: ReactNode;
  byline?: ReactNode;
}

type Props = ViewProps | EditProps;

export function WikiPageHeader(props: Props) {
  if (props.mode === "view") {
    return (
      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-bold tracking-tight">{props.title}</h1>
          {props.isDraft && (
            <Badge variant="secondary">{props.draftLabel ?? "Draft"}</Badge>
          )}
        </div>
        {props.summary && (
          <p className="text-base text-muted-foreground">{props.summary}</p>
        )}
        {props.byline && (
          <p className="text-sm text-muted-foreground">{props.byline}</p>
        )}
      </header>
    );
  }
  return (
    <header className="mb-6 space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">{props.titleNode}</div>
        {props.toolbarNode && <div className="shrink-0">{props.toolbarNode}</div>}
      </div>
      <div>{props.summaryNode}</div>
      {props.byline && (
        <p className="text-sm text-muted-foreground">{props.byline}</p>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/wiki/wiki-page-header.tsx
git commit -m "feat(wiki): add WikiPageHeader with view + edit modes"
```

---

### Task 11: Refactor WikiInfobox into WikiInfoboxCard with mode prop

**Files:**
- Modify: `components/wiki/wiki-infobox.tsx`

- [ ] **Step 1: Read the current file**

Open `components/wiki/wiki-infobox.tsx` to confirm structure (already read in design phase). Each section (image, KV table, related, tags) renders if its data is non-empty.

- [ ] **Step 2: Add a `mode` prop and pass it through (no visual change in view mode)**

At the top of `wiki-infobox.tsx`, add to `Props`:

```ts
interface Props {
  metadata: unknown;
  title: string;
  locale: "en" | "vi";
  relatedTitles?: Map<string, RelatedPageEntry>;
  i18n: InfoboxI18n;
  mode?: "view" | "edit";
  editSlots?: {
    image?: React.ReactNode;
    category?: React.ReactNode;
    stats?: React.ReactNode;
    location?: React.ReactNode;
    tags?: React.ReactNode;
    related?: React.ReactNode;
  };
}
```

In `WikiInfobox()`, default `mode = "view"`. Add `import * as React from "react"` if not present.

In each rendered section, when `mode === "edit"` AND the corresponding `editSlots[key]` is provided, render `editSlots[key]` instead of the readonly version. When the field is empty AND in edit mode, still render the slot (so user sees "+ Add X" placeholder).

Concretely, replace the early `if (isEmpty(m)) return null;` with:

```ts
  const isViewMode = mode === "view" || mode === undefined;
  if (isViewMode && isEmpty(m)) return null;
```

Replace each section's render (image, KV, related, tags) so that in edit mode it renders the slot if provided. Example for image:

```tsx
{(mode === "edit" && editSlots?.image) ? (
  editSlots.image
) : m.infoboxImage ? (
  // existing img block
) : null}
```

Apply the same shape to category, stats, location, tags, related.

- [ ] **Step 3: View page still renders correctly**

Start dev server (`npm run dev`), open `/wiki/<existing-slug>`. Visual must be identical — no slots passed → falls back to view rendering.

- [ ] **Step 4: Commit**

```bash
git add components/wiki/wiki-infobox.tsx
git commit -m "refactor(wiki): WikiInfobox accepts edit-mode slots"
```

---

### Task 12: Refactor view page to use WikiPageShell

**Files:**
- Modify: `app/wiki/[slug]/page.tsx`

- [ ] **Step 1: Replace the inline 2-column markup**

Replace the JSX in `WikiDetailPage()` from `<main>` onwards with:

```tsx
  return (
    <main className="container mx-auto px-4 py-8 max-w-7xl">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/wiki" className="hover:text-foreground">
          Wiki
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{title}</span>
      </nav>

      <WikiPageShell
        header={
          <WikiPageHeader
            mode="view"
            title={title}
            summary={isVi ? detail.latestRevision.summary_vi : detail.latestRevision.summary}
            isDraft={!detail.isPublished}
            byline={`${author} · ${updated.toLocaleString()}`}
          />
        }
        body={
          <>
            <WikiContentRenderer markdown={content} />
            <Separator className="my-8" />
            <Button asChild variant="link" className="px-0">
              <Link href={`/wiki/${encodeURIComponent(slug)}/history`}>
                View history →
              </Link>
            </Button>
          </>
        }
        infobox={
          <WikiInfobox
            metadata={detail.metadataJson}
            title={title}
            locale={uiLocale}
            relatedTitles={relatedTitles}
            i18n={infoboxI18n}
          />
        }
        toc={<WikiToc markdown={content} />}
      />
    </main>
  );
```

Add the imports at the top:

```ts
import { WikiPageShell } from "@/components/wiki/wiki-page-shell";
import { WikiPageHeader } from "@/components/wiki/wiki-page-header";
```

Remove the now-unused `Badge` import if WikiPageHeader handles the draft badge.

- [ ] **Step 2: Visual verify**

Open `/wiki/<existing-slug>` and `/wiki/<existing-slug>` while toggling locale. Layout must look identical to before.

- [ ] **Step 3: Commit**

```bash
git add app/wiki/[slug]/page.tsx
git commit -m "refactor(wiki): view page uses WikiPageShell + WikiPageHeader"
```

---

## Phase 4 — Inline edit components

Mỗi field metadata có một component nhỏ. Pattern: display state + edit state + click toggle. Tất cả lấy `useFormContext<WikiFormValue>()` từ react-hook-form.

### Task 13: EditableSummary component

**Files:**
- Create: `components/wiki/editable-summary.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  fieldName: "summary" | "summary_vi";
  placeholder: string;
}

export function EditableSummary({ fieldName, placeholder }: Props) {
  const form = useFormContext<WikiFormValue>();
  const value = useWatch({ control: form.control, name: fieldName }) ?? "";
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.setSelectionRange(value.length, value.length);
    }
  }, [editing, value]);

  if (editing) {
    return (
      <Textarea
        ref={taRef}
        rows={2}
        value={value}
        onChange={(e) =>
          form.setValue(fieldName, e.target.value, { shouldDirty: true })
        }
        onBlur={() => setEditing(false)}
        className="text-base text-muted-foreground"
        placeholder={placeholder}
      />
    );
  }

  return (
    <p
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className="text-base text-muted-foreground cursor-text rounded hover:bg-muted/30 px-1 -mx-1 min-h-[1.5rem]"
    >
      {value || (
        <span className="text-muted-foreground/60 italic">{placeholder}</span>
      )}
    </p>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/wiki/editable-summary.tsx
git commit -m "feat(wiki): add EditableSummary inline-edit component"
```

---

### Task 14: LocaleToggle component

**Files:**
- Create: `components/wiki/locale-toggle.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  value: "en" | "vi";
  onChange: (next: "en" | "vi") => void;
  enLabel: string;
  viLabel: string;
}

export function LocaleToggle({ value, onChange, enLabel, viLabel }: Props) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as "en" | "vi")}>
      <TabsList className="h-8">
        <TabsTrigger value="en">{enLabel}</TabsTrigger>
        <TabsTrigger value="vi">{viLabel}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/wiki/locale-toggle.tsx
git commit -m "feat(wiki): add LocaleToggle component"
```

---

### Task 15: EditableImageField component

**Files:**
- Create: `components/wiki/inline-infobox/editable-image-field.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadWikiImage } from "@/lib/wiki/api";
import { useI18n } from "@/lib/i18/i18n-context";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

export function EditableImageField() {
  const { t } = useI18n();
  const form = useFormContext<WikiFormValue>();
  const url = useWatch({ control: form.control, name: "metadata.infoboxImage" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const r = await uploadWikiImage(file);
      form.setValue("metadata.infoboxImage", r.url, { shouldDirty: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        t("wiki.metadata.upload_failed");
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const remove = () =>
    form.setValue("metadata.infoboxImage", undefined, { shouldDirty: true });

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFile}
        className="hidden"
      />
      {url ? (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="aspect-square w-full rounded-md bg-muted object-contain"
          />
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/40 rounded-md">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              {t("wiki.metadata.replace_button")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={uploading}
              onClick={remove}
            >
              <X className="h-3 w-3 mr-1" />
              {t("wiki.metadata.remove_button")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square w-full rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center gap-2 hover:bg-muted/40 text-muted-foreground"
        >
          <Upload className="h-6 w-6" />
          <span className="text-xs">
            {uploading
              ? t("wiki.metadata.uploading")
              : t("wiki.metadata.upload_button")}
          </span>
        </button>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/wiki/inline-infobox/editable-image-field.tsx
git commit -m "feat(wiki): add EditableImageField inline component"
```

---

### Task 16: EditableCategoryField + EditableLocationField

**Files:**
- Create: `components/wiki/inline-infobox/editable-category-field.tsx`
- Create: `components/wiki/inline-infobox/editable-location-field.tsx`

- [ ] **Step 1: Write category field**

```tsx
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18/i18n-context";
import { WIKI_CATEGORIES, type WikiCategory } from "@/models/dtos/wiki-metadata.dto";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

export function EditableCategoryField() {
  const { t } = useI18n();
  const form = useFormContext<WikiFormValue>();
  const value = useWatch({ control: form.control, name: "metadata.category" });

  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) =>
        form.setValue(
          "metadata.category",
          v ? (v as WikiCategory) : undefined,
          { shouldDirty: true },
        )
      }
    >
      <SelectTrigger className="w-full h-7 text-sm">
        <SelectValue placeholder={t("wiki.metadata.category_none")} />
      </SelectTrigger>
      <SelectContent>
        {WIKI_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {t(`wiki.metadata.category.${c}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Write location field**

```tsx
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  locale: "en" | "vi";
  placeholder: string;
}

export function EditableLocationField({ locale, placeholder }: Props) {
  const form = useFormContext<WikiFormValue>();
  const fieldName = locale === "vi" ? "metadata.location_vi" : "metadata.location";
  const value = useWatch({ control: form.control, name: fieldName }) ?? "";

  return (
    <Input
      value={value}
      onChange={(e) =>
        form.setValue(fieldName, e.target.value, { shouldDirty: true })
      }
      placeholder={placeholder}
      maxLength={120}
      className="h-7 text-sm"
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/wiki/inline-infobox/editable-category-field.tsx components/wiki/inline-infobox/editable-location-field.tsx
git commit -m "feat(wiki): add EditableCategoryField + EditableLocationField"
```

---

### Task 17: EditableStatsField

**Files:**
- Create: `components/wiki/inline-infobox/editable-stats-field.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

export function EditableStatsField() {
  const form = useFormContext<WikiFormValue>();
  const stats = useWatch({ control: form.control, name: "metadata.stats" }) ?? {};
  const entries = Object.entries(stats);

  const setStats = (next: Record<string, string>) =>
    form.setValue("metadata.stats", next, { shouldDirty: true });

  const renameKey = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    const next: Record<string, string> = {};
    for (const [k, v] of entries) {
      next[k === oldKey ? newKey : k] = v as string;
    }
    setStats(next);
  };

  const setValue = (key: string, value: string) => {
    setStats({ ...stats, [key]: value });
  };

  const remove = (key: string) => {
    const next = { ...stats };
    delete next[key];
    setStats(next);
  };

  const add = () => {
    let i = 1;
    let key = `stat${i}`;
    while (Object.prototype.hasOwnProperty.call(stats, key)) {
      i++;
      key = `stat${i}`;
    }
    setStats({ ...stats, [key]: "" });
  };

  return (
    <div className="space-y-1">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1 group">
          <Input
            value={k}
            onChange={(e) => renameKey(k, e.target.value)}
            className="h-7 text-sm flex-1"
          />
          <Input
            value={v as string}
            onChange={(e) => setValue(k, e.target.value)}
            className="h-7 text-sm flex-1 text-right tabular-nums"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100"
            onClick={() => remove(k)}
            aria-label="Remove stat"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={add}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add stat
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/wiki/inline-infobox/editable-stats-field.tsx
git commit -m "feat(wiki): add EditableStatsField inline component"
```

---

### Task 18: EditableTagsField + EditableRelatedField

**Files:**
- Create: `components/wiki/inline-infobox/editable-tags-field.tsx`
- Create: `components/wiki/inline-infobox/editable-related-field.tsx`

- [ ] **Step 1: Write tags field (wraps existing TagsInput)**

```tsx
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { TagsInput } from "@/components/wiki/metadata/tags-input";
import { useI18n } from "@/lib/i18/i18n-context";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  locale: "en" | "vi";
}

export function EditableTagsField({ locale }: Props) {
  const { t } = useI18n();
  const form = useFormContext<WikiFormValue>();
  const fieldName = locale === "vi" ? "metadata.tags_vi" : "metadata.tags";
  const value = useWatch({ control: form.control, name: fieldName }) ?? [];

  return (
    <TagsInput
      value={value as string[]}
      onChange={(next) =>
        form.setValue(fieldName, next, { shouldDirty: true })
      }
      placeholder={t("wiki.metadata.tag_placeholder")}
    />
  );
}
```

- [ ] **Step 2: Write related field (wraps RelatedPagesPicker)**

```tsx
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { RelatedPagesPicker } from "@/components/wiki/metadata/related-pages-picker";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  excludeSlug?: string;
  locale: "en" | "vi";
}

export function EditableRelatedField({ excludeSlug, locale }: Props) {
  const form = useFormContext<WikiFormValue>();
  const value =
    useWatch({ control: form.control, name: "metadata.relatedPages" }) ?? [];

  return (
    <RelatedPagesPicker
      value={value as string[]}
      onChange={(next) =>
        form.setValue("metadata.relatedPages", next, { shouldDirty: true })
      }
      excludeSlug={excludeSlug}
      locale={locale}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/wiki/inline-infobox/editable-tags-field.tsx components/wiki/inline-infobox/editable-related-field.tsx
git commit -m "feat(wiki): add EditableTagsField + EditableRelatedField"
```

---

### Task 19: EditableInfobox composer

**Files:**
- Create: `components/wiki/inline-infobox/editable-infobox.tsx`

- [ ] **Step 1: Write the composer that supplies all slots to WikiInfobox**

```tsx
"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { wikiMetadataSchema, emptyWikiMetadata } from "@/models/dtos/wiki-metadata.dto";
import { WikiInfobox } from "@/components/wiki/wiki-infobox";
import { EditableImageField } from "./editable-image-field";
import { EditableCategoryField } from "./editable-category-field";
import { EditableStatsField } from "./editable-stats-field";
import { EditableLocationField } from "./editable-location-field";
import { EditableTagsField } from "./editable-tags-field";
import { EditableRelatedField } from "./editable-related-field";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";
import type { RelatedPageEntry } from "@/lib/wiki/related-api";
import enDict from "@/locales/en.json";
import viDict from "@/locales/vi.json";

interface Props {
  locale: "en" | "vi";
  excludeSlug?: string;
  relatedTitles?: Map<string, RelatedPageEntry>;
}

export function EditableInfobox({ locale, excludeSlug, relatedTitles }: Props) {
  const form = useFormContext<WikiFormValue>();
  const metadata = useWatch({ control: form.control, name: "metadata" }) ?? emptyWikiMetadata;
  const title = useWatch({ control: form.control, name: locale === "vi" ? "title_vi" : "title" }) ?? "";

  const dict = locale === "vi" ? viDict : enDict;
  const i18n = {
    infoboxLabel: dict.wiki.metadata.infobox_label,
    categoryLabel: dict.wiki.metadata.category_label,
    categoryName: (c: keyof typeof dict.wiki.metadata.category) => dict.wiki.metadata.category[c],
    statsLabel: dict.wiki.metadata.stats,
    locationLabel: locale === "vi" ? dict.wiki.metadata.location_vi : dict.wiki.metadata.location_en,
    relatedLabel: dict.wiki.metadata.related_pages,
    tagsLabel: locale === "vi" ? dict.wiki.metadata.tags_vi : dict.wiki.metadata.tags_en,
  };

  return (
    <WikiInfobox
      metadata={metadata}
      title={title || dict.wiki.edit.untitled_placeholder}
      locale={locale}
      relatedTitles={relatedTitles}
      i18n={i18n}
      mode="edit"
      editSlots={{
        image: <EditableImageField />,
        category: <EditableCategoryField />,
        stats: <EditableStatsField />,
        location: (
          <EditableLocationField
            locale={locale}
            placeholder={
              locale === "vi"
                ? dict.wiki.metadata.location_vi
                : dict.wiki.metadata.location_en
            }
          />
        ),
        tags: <EditableTagsField locale={locale} />,
        related: <EditableRelatedField excludeSlug={excludeSlug} locale={locale} />,
      }}
    />
  );
}
```

- [ ] **Step 2: Add `wiki.edit.untitled_placeholder` key to both locale files**

In `locales/en.json`, under `wiki.edit`:
```json
"untitled_placeholder": "Untitled"
```

In `locales/vi.json`, under `wiki.edit`:
```json
"untitled_placeholder": "Chưa đặt tên"
```

- [ ] **Step 3: Commit**

```bash
git add components/wiki/inline-infobox/editable-infobox.tsx locales/en.json locales/vi.json
git commit -m "feat(wiki): add EditableInfobox composer with all editable slots"
```

---

## Phase 5 — Refactor edit page sang layout mới

Đổi `TiptapEditor` prop signature, refactor `WikiForm` thành layout `WikiPageShell` 2-column, rút gọn Settings sheet.

### Task 20: Change TiptapEditor to single-locale prop

**Files:**
- Modify: `components/wiki/editor/tiptap-editor.tsx`

- [ ] **Step 1: Replace Props interface and component signature**

Open `components/wiki/editor/tiptap-editor.tsx`. Replace the `TiptapEditorValue` interface and `Props` interface with:

```ts
interface Props {
  value: string;
  onChange: (next: string) => void;
  readonly?: boolean;
  onUploadError?: (msg: string) => void;
  onCopyFromOther?: () => void;
  copyLabel?: string;
}
```

Remove `export interface TiptapEditorValue` entirely.

- [ ] **Step 2: Simplify the component body**

Replace the function body (everything after `export function TiptapEditor({ ... })`) with:

```tsx
export function TiptapEditor({
  value,
  onChange,
  readonly = false,
  onUploadError,
  onCopyFromOther,
  copyLabel,
}: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    editable: !readonly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const md = getMarkdown(editor);
      if (md !== valueRef.current) onChange(md);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = getMarkdown(editor);
    if (current !== value) setMarkdown(editor, value);
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    const detach = attachImageDropAndPaste(editor, (msg) => onUploadError?.(msg));
    return detach;
  }, [editor, onUploadError]);

  return (
    <div className="rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
      {(onCopyFromOther || true) && (
        <div className="flex items-center justify-end border-b bg-muted/30 px-2 h-9">
          {onCopyFromOther && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCopyFromOther}
            >
              {copyLabel ?? "Copy from other locale"}
            </Button>
          )}
        </div>
      )}
      <TiptapToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-slate dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
```

Remove imports of `Tabs`, `TabsList`, `TabsTrigger`, `useState`, `useI18n` if no longer needed. Keep `Button`, `useEffect`, `useRef`.

- [ ] **Step 3: Commit**

```bash
git add components/wiki/editor/tiptap-editor.tsx
git commit -m "refactor(wiki): TiptapEditor accepts single-locale value/onChange"
```

---

### Task 21: Refactor WikiSettingsSheet — keep only slug + publish

**Files:**
- Modify: `components/wiki/wiki-settings-sheet.tsx`

- [ ] **Step 1: Remove title, summary, metadata sections**

Replace the body of `<SheetContent>` so only the URL section and status section remain:

```tsx
        <div className="space-y-6 py-4">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("wiki.settings.url_section")}
            </h3>
            <div className="space-y-1">
              <Label>{t("wiki.tab_en")}</Label>
              <SlugEditRow name="slug" onTouchedChange={onSlugEnTouched} />
            </div>
            <div className="space-y-1">
              <Label>{t("wiki.tab_vi")}</Label>
              <SlugEditRow name="slug_vi" onTouchedChange={onSlugViTouched} />
            </div>
          </section>

          <Separator />

          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("wiki.settings.status_section")}
            </h3>
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4 rounded border p-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium">
                      {field.value
                        ? t("wiki.settings.published_label")
                        : t("wiki.settings.draft_label")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {field.value
                        ? t("wiki.settings.published_desc")
                        : t("wiki.settings.draft_desc")}
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </section>
        </div>
```

- [ ] **Step 2: Remove now-unused imports**

Remove these imports if not used elsewhere in the file: `Controller`, `Input`, `Textarea`, `WikiMetadataForm`. Keep: `useFormContext`, `Sheet*`, `FormField/FormItem/FormControl/FormLabel/Form-message`, `Label`, `Switch`, `Separator`, `SlugEditRow`, `useI18n`, `WikiFormValue`. Remove `excludeSlug` and `locale` from the props if no longer needed (slug edit rows do not need them).

- [ ] **Step 3: Update the Props interface**

```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSlugEnTouched?: (touched: boolean) => void;
  onSlugViTouched?: (touched: boolean) => void;
}
```

Remove `excludeSlug` and `locale` from props and from the function signature.

- [ ] **Step 4: Commit**

```bash
git add components/wiki/wiki-settings-sheet.tsx
git commit -m "refactor(wiki): Settings sheet keeps only slug + publish"
```

---

### Task 22: Refactor WikiForm to use WikiPageShell

**Files:**
- Modify: `components/wiki/wiki-form.tsx`

- [ ] **Step 1: Add LocaleToggle + EditableInfobox + EditableSummary imports**

At the top of `wiki-form.tsx`, add:

```ts
import { useI18n } from "@/lib/i18/i18n-context";
import { WikiPageShell } from "./wiki-page-shell";
import { WikiPageHeader } from "./wiki-page-header";
import { LocaleToggle } from "./locale-toggle";
import { EditableSummary } from "./editable-summary";
import { EditableInfobox } from "./inline-infobox/editable-infobox";
```

(Existing imports remain.)

- [ ] **Step 2: Inside WikiForm() add a locale state**

Right after `const { t } = useI18n();` add:

```ts
const { t, locale: i18nLocale } = useI18n();
const [activeLocale, setActiveLocale] = useState<"en" | "vi">(
  i18nLocale === "vi" ? "vi" : "en",
);
```

(Replace the existing `const { t } = useI18n();` line.)

- [ ] **Step 3: Compute current-locale field names + values**

Below the locale state, add:

```ts
const titleField = activeLocale === "vi" ? "title_vi" : "title";
const summaryField = activeLocale === "vi" ? "summary_vi" : "summary";
const contentField = activeLocale === "vi" ? "content_vi" : "content";
const titleValue = form.watch(titleField);
const summaryPlaceholder = activeLocale === "vi"
  ? t("wiki.edit.summary_placeholder_vi")
  : t("wiki.edit.summary_placeholder_en");
```

Add the two i18n keys `wiki.edit.summary_placeholder_en` ("Add a short summary…") and `wiki.edit.summary_placeholder_vi` ("Thêm tóm tắt ngắn…") to `locales/en.json` and `locales/vi.json`.

- [ ] **Step 4: Replace the existing JSX from `<Form>` onwards**

Replace the entire `return ( <Form ... > ... </Form> )` block with:

```tsx
  return (
    <Form {...form}>
      <WikiPageShell
        header={
          <WikiPageHeader
            mode="edit"
            titleNode={
              <>
                <EditableTitle
                  value={titleValue}
                  onChange={(v) =>
                    form.setValue(titleField, v, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder={t("wiki.edit.title_placeholder")}
                  error={
                    activeLocale === "vi"
                      ? errors.title_vi?.message
                        ? t(errors.title_vi.message)
                        : null
                      : errors.title?.message
                        ? t(errors.title.message)
                        : null
                  }
                />
                <div className="mt-2">
                  <EditableSummary
                    fieldName={summaryField}
                    placeholder={summaryPlaceholder}
                  />
                </div>
              </>
            }
            summaryNode={null}
            byline={headerSubtitle}
            toolbarNode={
              <div className="flex items-center gap-2">
                <LocaleToggle
                  value={activeLocale}
                  onChange={setActiveLocale}
                  enLabel={t("wiki.tab_en")}
                  viLabel={t("wiki.tab_vi")}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettingsOpen(true)}
                  className="relative shrink-0"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {t("wiki.edit.settings_button")}
                  {settingsHasError && (
                    <span
                      aria-hidden
                      className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive"
                    />
                  )}
                </Button>
              </div>
            }
          />
        }
        body={
          <>
            <Label className="sr-only">{t("wiki.field_content")}</Label>
            <TiptapEditor
              value={form.watch(contentField)}
              onChange={(next) =>
                form.setValue(contentField, next, { shouldDirty: true })
              }
              onCopyFromOther={() => {
                const otherField = activeLocale === "vi" ? "content" : "content_vi";
                form.setValue(contentField, form.getValues(otherField), {
                  shouldDirty: true,
                });
              }}
              copyLabel={
                activeLocale === "en"
                  ? t("wiki.copy_from_vi")
                  : t("wiki.copy_from_en")
              }
            />
            {submitError && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </>
        }
        infobox={
          <EditableInfobox locale={activeLocale} excludeSlug={excludeSlug} />
        }
      />

      <StickySaveBar
        isDirty={isDirty}
        saving={saving}
        canSubmitDraft={canSubmitDraft}
        canPublish={canPublish}
        onSaveDraft={() => submitWithMode("draft")}
        onPublish={() => submitWithMode("publish")}
        onCancel={requestCancel}
      />

      <WikiSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSlugEnTouched={setSlugEnTouched}
        onSlugViTouched={setSlugViTouched}
      />

      <AlertDialog open={warnSame} onOpenChange={setWarnSame}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Same content in both languages</AlertDialogTitle>
            <AlertDialogDescription>
              {t("wiki.publish_warn_same_content")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublishConfirmed}>
              Publish anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("wiki.edit.cancel_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("wiki.edit.cancel_confirm_message")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("wiki.edit.cancel_confirm_stay")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCancel(false);
                onCancel?.();
              }}
            >
              {t("wiki.edit.cancel_confirm_leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
```

- [ ] **Step 5: Remove the `locale` prop from WikiForm Props if it's no longer used externally**

Check `app/(dashboard)/dashboard/wiki/[id]/edit/page.tsx`. It currently passes `locale={locale}`. The new WikiForm reads locale from `useI18n()` directly, so the prop is unused. Update the WikiForm `Props` interface in `wiki-form.tsx` to remove `locale: "en" | "vi"`. Remove `locale={locale}` from the call site (both occurrences in `[id]/edit/page.tsx`).

- [ ] **Step 6: Run type check + lint**

```bash
npm run lint
```
Expected: PASS. Fix any unused-import warnings.

- [ ] **Step 7: Commit**

```bash
git add components/wiki/wiki-form.tsx app/(dashboard)/dashboard/wiki/[id]/edit/page.tsx locales/en.json locales/vi.json
git commit -m "refactor(wiki): edit page uses WikiPageShell with inline metadata"
```

---

## Phase 6 — Stub create flow + cleanup

Bỏ trang `/dashboard/wiki/new`, list page gọi stub create và redirect, eager cleanup khi rời stub.

### Task 23: List page button calls stub create

**Files:**
- Modify: `app/(dashboard)/dashboard/wiki/admin-wiki-list-client.tsx` (or wherever the New wiki button lives — verify with grep first)

- [ ] **Step 1: Verify button location**

```bash
grep -n "wiki/new\|New wiki\|wiki.new" app/\(dashboard\)/dashboard/wiki/*.tsx
```

Note the file and line of the existing "New wiki" link. The plan assumes it lives in `admin-wiki-list-client.tsx`; if it's in `page.tsx`, apply the same change there.

- [ ] **Step 2: Replace `<Link href="/dashboard/wiki/new">` with a click handler**

In the file containing the button, change:

```tsx
<Button asChild>
  <Link href="/dashboard/wiki/new">{t("wiki.list.new_button")}</Link>
</Button>
```

to:

```tsx
<Button onClick={createStub} disabled={creating}>
  {creating ? t("wiki.new.creating") : t("wiki.list.new_button")}
</Button>
```

Add at the top of the component:

```ts
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { createWikiStub } from "@/lib/wiki/api";
```

Inside the component, add:

```ts
const router = useRouter();
const [creating, setCreating] = useState(false);
const createStub = async () => {
  setCreating(true);
  try {
    const detail = await createWikiStub();
    router.push(`/dashboard/wiki/${detail.id}/edit`);
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      t("wiki.new.create_failed");
    toast.error(msg);
    setCreating(false);
  }
};
```

If the existing `<Link href="/dashboard/wiki/new">` is the only usage of `Link` in the file, remove the `Link` import.

- [ ] **Step 3: Smoke test**

Run dev server. On `/dashboard/wiki`, click New wiki. Expected: redirect to `/dashboard/wiki/{id}/edit` with empty title and stub slug.

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/dashboard/wiki/
git commit -m "feat(wiki): list page New button creates stub + redirects"
```

---

### Task 24: Edit page handles stub state + eager cleanup

**Files:**
- Modify: `app/(dashboard)/dashboard/wiki/[id]/edit/page.tsx`
- Modify: `lib/wiki/api.ts` (add `deleteWiki` if missing)

- [ ] **Step 1: Verify deleteWiki helper exists**

```bash
grep -n "deleteWiki\|DELETE.*wiki" lib/wiki/api.ts
```

If absent, add to `lib/wiki/api.ts`:

```ts
export async function deleteWiki(id: string): Promise<void> {
  await apiClient.delete(`/wiki/${id}`);
}
```

- [ ] **Step 2: Detect stub state in edit page**

In `app/(dashboard)/dashboard/wiki/[id]/edit/page.tsx`, after `setDetail(detail)` resolves, compute:

```ts
const isStub =
  detail !== null &&
  detail.title === "" &&
  detail.title_vi === "" &&
  detail.latestRevision.content === "" &&
  detail.latestRevision.content_vi === "";
```

(Place this above the JSX return.)

- [ ] **Step 3: Track form-dirty state from WikiForm via onDirtyChange**

WikiForm already exposes `onDirtyChange`. In the page component:

```ts
const [isDirty, setIsDirty] = useState(false);
// pass onDirtyChange={setIsDirty} to <WikiForm>
```

- [ ] **Step 4: Cancel handler — delete stub when applicable**

Replace the existing `onCancel` handler:

```ts
const onCancel = async () => {
  if (isStub && !isDirty) {
    try {
      await deleteWiki(id);
    } catch {
      // best-effort; still navigate away
    }
  }
  router.push("/dashboard/wiki");
};
```

Wire `onCancel` into `<WikiForm onCancel={onCancel} />`.

Add the import: `import { deleteWiki } from "@/lib/wiki/api";`.

- [ ] **Step 5: Best-effort cleanup on tab close (optional)**

Add inside the page component:

```ts
useEffect(() => {
  if (!isStub || isDirty) return;
  const handler = () => {
    navigator.sendBeacon?.(`/api/wiki/${id}`, new Blob([], { type: "application/json" }));
  };
  window.addEventListener("pagehide", handler);
  return () => window.removeEventListener("pagehide", handler);
}, [isStub, isDirty, id]);
```

Note: `sendBeacon` issues POST by default; the BFF route at `/api/wiki/{id}` does not currently accept POST for delete. Skip this step if the BFF doesn't support beacon-style cleanup. The Cancel button path covers the main case; tab-close leftovers are acceptable per spec.

- [ ] **Step 6: Smoke test**

1. List → New wiki → editor opens with empty title.
2. Click Cancel without typing. Expected: redirect to list, the stub wiki is deleted (verify list shows no `untitled-xxxxxx`).
3. Type a title, then click Cancel. Confirm dialog appears (form is dirty); after Confirm-leave, the wiki is NOT deleted.

- [ ] **Step 7: Commit**

```bash
git add app/(dashboard)/dashboard/wiki/[id]/edit/page.tsx lib/wiki/api.ts
git commit -m "feat(wiki): eager-cleanup stub wiki when leaving without edits"
```

---

### Task 25: Delete obsolete wizard files

**Files:**
- Delete: `app/(dashboard)/dashboard/wiki/new/page.tsx`
- Delete: `models/dtos/wiki-create-step1.dto.ts`

- [ ] **Step 1: Confirm no other references**

```bash
grep -rn "wiki-create-step1\|/dashboard/wiki/new" app components lib models --include="*.ts" --include="*.tsx"
```

Expected: only the two files above match. If anything else references them, fix or update those references first.

- [ ] **Step 2: Delete the files**

```bash
git rm app/\(dashboard\)/dashboard/wiki/new/page.tsx models/dtos/wiki-create-step1.dto.ts
```

If the directory `app/(dashboard)/dashboard/wiki/new/` is now empty, also remove it:

```bash
rmdir app/\(dashboard\)/dashboard/wiki/new 2>/dev/null
```

- [ ] **Step 3: Run lint + build**

```bash
npm run lint
npm run build
```
Expected: PASS. If build fails on a missing import, search for and fix any leftover references.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(wiki): remove obsolete two-step create wizard"
```

---

## Phase 7 — History UI mở rộng

`wiki-diff-view.tsx` thêm sections diff title/slug/metadata. Rollback UI vẫn dùng cùng endpoint nhưng giờ sẽ apply mọi fields nhờ Phase 1.

### Task 26: Read existing diff view + history page

**Files:**
- Modify: `components/wiki/wiki-diff-view.tsx` (read first)
- Reference: `app/wiki/[slug]/history/[revisionId]/page.tsx`

- [ ] **Step 1: Open and skim both files**

```bash
grep -n "WikiDiffView\|wiki-diff-view" components/wiki/wiki-diff-view.tsx app/wiki/\[slug\]/history/\[revisionId\]/page.tsx
```

Confirm the diff component takes `{ en: chunks, vi: chunks }` and renders content diff. Note its props shape — needed in next task.

- [ ] **Step 2: No code changes — just understanding**

This is a reading task; no commit.

---

### Task 27: Render metadata diff above content diff

**Files:**
- Modify: `components/wiki/wiki-diff-view.tsx`
- Modify: `app/wiki/[slug]/history/[revisionId]/page.tsx`

- [ ] **Step 1: Add a `MetadataDiff` helper inside `wiki-diff-view.tsx`**

Above the existing diff component, add:

```tsx
interface RevSnapshot {
  title: string;
  title_vi: string;
  slug: string;
  slug_vi: string;
  metadataJson: Record<string, unknown> | null;
  isPublished: boolean;
}

interface MetadataDiffProps {
  current: RevSnapshot;
  previous: RevSnapshot | null;
}

function fieldChangeLine(label: string, prev: string, curr: string) {
  if (prev === curr) return null;
  return (
    <li className="text-sm" key={label}>
      <span className="font-medium">{label}:</span>{" "}
      <span className="line-through text-muted-foreground">{prev || "(empty)"}</span>
      {" → "}
      <span>{curr || "(empty)"}</span>
    </li>
  );
}

export function MetadataDiff({ current, previous }: MetadataDiffProps) {
  if (!previous) return null;
  const lines = [
    fieldChangeLine("Title (EN)", previous.title, current.title),
    fieldChangeLine("Title (VI)", previous.title_vi, current.title_vi),
    fieldChangeLine("Slug (EN)", previous.slug, current.slug),
    fieldChangeLine("Slug (VI)", previous.slug_vi, current.slug_vi),
    fieldChangeLine(
      "Published",
      String(previous.isPublished),
      String(current.isPublished),
    ),
  ].filter(Boolean);

  const prevMeta = JSON.stringify(previous.metadataJson ?? {}, null, 2);
  const currMeta = JSON.stringify(current.metadataJson ?? {}, null, 2);
  const metaChanged = prevMeta !== currMeta;

  if (lines.length === 0 && !metaChanged) return null;

  return (
    <section className="rounded-md border p-4 space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Metadata changes
      </h3>
      {lines.length > 0 && <ul className="space-y-1">{lines}</ul>}
      {metaChanged && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Show full metadata JSON diff
          </summary>
          <pre className="mt-2 overflow-x-auto bg-muted/50 p-2 rounded">
            {`- ${prevMeta.replace(/\n/g, "\n- ")}\n+ ${currMeta.replace(/\n/g, "\n+ ")}`}
          </pre>
        </details>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Render MetadataDiff in the revision detail page**

In `app/wiki/[slug]/history/[revisionId]/page.tsx`, find where `<WikiDiffView>` is rendered. Above it, add:

```tsx
<MetadataDiff
  current={{
    title: diff.current.title,
    title_vi: diff.current.title_vi,
    slug: diff.current.slug,
    slug_vi: diff.current.slug_vi,
    metadataJson: diff.current.metadataJson,
    isPublished: diff.current.isPublished,
  }}
  previous={
    diff.previous
      ? {
          title: diff.previous.title,
          title_vi: diff.previous.title_vi,
          slug: diff.previous.slug,
          slug_vi: diff.previous.slug_vi,
          metadataJson: diff.previous.metadataJson,
          isPublished: diff.previous.isPublished,
        }
      : null
  }
/>
```

Add the import: `import { MetadataDiff } from "@/components/wiki/wiki-diff-view";`.

- [ ] **Step 3: Smoke test**

Open a revision detail page where a previous revision had a different title or category. Confirm the Metadata changes section appears.

- [ ] **Step 4: Commit**

```bash
git add components/wiki/wiki-diff-view.tsx app/wiki/\[slug\]/history/\[revisionId\]/page.tsx
git commit -m "feat(wiki): show metadata changes in revision diff view"
```

---

### Task 28: Update history list to show metadata-change indicator

**Files:**
- Modify: `components/wiki/wiki-history-list.tsx`

- [ ] **Step 1: Add a small badge when title/slug/metadata differs from previous entry**

Open `components/wiki/wiki-history-list.tsx` and locate the row rendering. The history items now include `title`, `slug`, `metadataJson`, `isPublished` (Task 5). For each row except the last, compute differences against `items[i+1]` (the next-older revision) and show a compact indicator:

```tsx
const next = items[i + 1];
const changedFields: string[] = [];
if (next) {
  if (item.title !== next.title || item.title_vi !== next.title_vi) changedFields.push("title");
  if (item.slug !== next.slug || item.slug_vi !== next.slug_vi) changedFields.push("slug");
  if (
    JSON.stringify(item.metadataJson ?? {}) !==
    JSON.stringify(next.metadataJson ?? {})
  ) {
    changedFields.push("metadata");
  }
  if (item.isPublished !== next.isPublished) changedFields.push("published");
}
```

Render `changedFields.length > 0` as a Badge row beneath the existing summary line:

```tsx
{changedFields.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {changedFields.map((f) => (
      <Badge key={f} variant="outline" className="text-xs">
        {f}
      </Badge>
    ))}
  </div>
)}
```

- [ ] **Step 2: Smoke test**

Open the history page for a wiki with multiple revisions. Confirm rows show `title` / `metadata` etc. badges where expected.

- [ ] **Step 3: Commit**

```bash
git add components/wiki/wiki-history-list.tsx
git commit -m "feat(wiki): mark metadata-changing revisions in history list"
```

---

## Phase 8 — Polish & QA

### Task 29: Visual + accessibility QA + final cleanup

**Files:**
- Modify: any inline-edit component flagged during QA

- [ ] **Step 1: Visual parity check**

Start dev server. Open `/wiki/<slug>` (view) and `/dashboard/wiki/<id>/edit` (edit) for the same wiki. Compare:
- Title size + weight identical
- Summary spacing/color identical
- Infobox card width, padding, separators identical
- Body prose typography identical (h1, h2, p, lists, blockquote, code)

Note any drift. Fix by reusing the same Tailwind classes or extracting a shared `prose` config.

- [ ] **Step 2: Mobile layout check**

Resize browser to <1024px. Confirm `WikiPageShell` collapses infobox above content on both view and edit pages. Test inline edit on small viewport — popovers and selects should remain usable.

- [ ] **Step 3: Locale toggle keyboard**

Tab into the locale toggle. Confirm Left/Right arrows switch focus between EN/VI and Enter activates. (`Tabs` from shadcn/ui handles this by default.)

- [ ] **Step 4: Inline editor focus management**

Click each infobox slot in turn (image upload, category, stats row, location, tag, related). Verify focus moves into the active editor. Press Tab — focus should leave the field cleanly.

- [ ] **Step 5: Empty-state placeholders**

For a brand-new stub wiki, every infobox slot in edit mode should show a "+ Add X" affordance, not be invisible. Walk through each — image (dashed upload box), category (Select with placeholder), stats (Add stat button), location (empty input), tags (empty input), related (empty picker).

- [ ] **Step 6: Save/publish/conflict flows**

- Save Draft on a stub with empty title → expect title-required error inline.
- Save Draft after typing title and body → expect success toast + form reset.
- Open the same wiki in two tabs, save in tab A, then save in tab B → expect conflict dialog in tab B.
- Force overwrite path works.

- [ ] **Step 7: Run full backend tests**

```bash
cd server && npm test
```
Expected: all PASS.

- [ ] **Step 8: Run frontend lint + build**

```bash
cd ..
npm run lint
npm run build
```
Expected: PASS.

- [ ] **Step 9: Commit any QA fixes**

```bash
git add -A
git commit -m "fix(wiki): polish inline editor visuals + a11y after QA"
```

If no fixes were needed, skip the commit.

---

## Done

All eight phases complete. The editor now:
- Renders the same 2-column layout as the public page in both view and edit modes
- Lets users edit title, summary, body, and every infobox field inline with click-to-edit affordances
- Persists every save as a full revision snapshot (title, slug, metadata, content, isPublished)
- Skips the wizard step — the New button creates a stub wiki and lands directly in the editor
- Cleans up abandoned stubs when the user cancels without making changes
- Surfaces metadata changes in history view + diff page
