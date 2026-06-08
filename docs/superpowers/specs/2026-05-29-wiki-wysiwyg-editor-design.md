# Wiki WYSIWYG Editor Redesign — Design

**Status**: Draft
**Date**: 2026-05-29
**Owner**: Wiki team

## Goal

Hợp nhất trang create/edit wiki thành một WYSIWYG editor duy nhất nhìn giống hệt public page (`/wiki/[slug]`). Bỏ wizard 2 bước, bỏ Settings sheet cồng kềnh — nội dung và metadata được sửa inline ngay trên layout 2-cột giống public.

Đồng thời gộp content của `WikiRevision` và các field "live" trên `Wiki` (title, slug, metadata, isPublished) vào revision snapshot, để lịch sử ghi nhận đầy đủ thay đổi của trang.

## Non-goals

- Không thay đổi public viewer page chrome (header, breadcrumb, ToC) ngoài việc trích xuất layout primitives.
- Không build collaborative editing realtime.
- Không đổi hệ thống auth, permission, hay i18n.
- Không thay TipTap bằng editor framework khác.

## Background

**Hiện trạng**:

- Create: wizard 2 bước. Step 1 ở `/dashboard/wiki/new` thu thập title EN/VI + slug; backend tạo wiki với content rỗng; redirect sang edit. Step 2 là trang edit.
- Edit: `/dashboard/wiki/[id]/edit` render `WikiForm` — title inline + Tiptap editor có tabs EN/VI nội bộ + Settings sheet (slug, summary, isPublished, metadata) bên phải khi click button.
- Public: `/wiki/[slug]` render layout 2-cột — content chính bên trái, infobox + ToC bên phải. Editor và public hiện không share component.
- Revision: bảng `WikiRevision` lưu `content`, `content_vi`, `summary`, `summary_vi`. Title/slug/metadata/isPublished là field live trên `Wiki` → không tracked qua history.

**Vấn đề**:

1. Edit UI không phản ánh trang public — user phải imagine layout cuối từ form fields.
2. Settings sheet bao trọn slug + summary + isPublished + metadata → user phải mở/đóng sheet liên tục.
3. Wizard 2 bước phá flow tạo nhanh — user phải nghĩ slug trước khi nghĩ nội dung.
4. History chỉ thấy thay đổi body, mất thông tin về rename title, đổi tag, thêm category.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Editor full WYSIWYG, mọi field inline | "Nhìn thế nào ra thế đó" |
| D2 | Single-locale view + toggle EN/VI | Match public render mode |
| D3 | Giữ Save Draft / Publish thủ công | Tránh write-storm vào revision; predictable conflict |
| D4 | Inline edit infobox + summary; slug + publish vẫn ở Settings sheet | Slug không hiện public → không cần inline |
| D5 | Revision = snapshot toàn bộ (title, slug, content, metadata, isPublished) | History đầy đủ, rollback đầy đủ |
| D6 | Skip wizard create — tạo stub rồi vào edit; eager cleanup khi rời | Tận dụng layout WYSIWYG, ít rác hơn lazy cleanup |
| D7 | Tách layout primitives `WikiPageShell`, dùng chung edit/view, hai mode | Code reuse cao, ít drift visual |

## Architecture

### Shared layout primitives

Ba component được tách để view (`/wiki/[slug]`) và edit (`/dashboard/wiki/[id]/edit`) share:

- **`WikiPageShell`** — root layout 2-column. Props: `header`, `body`, `infobox`, `toc?`. Mobile collapse infobox lên trên.
- **`WikiPageHeader`** — render title + summary + byline. Props: `mode: "view" | "edit"`. Edit mode nest `EditableTitle` (đã có) + `EditableSummary` (mới). View mode render `<h1>` + `<p>`.
- **`WikiInfoboxCard`** — refactor từ `WikiInfobox`. Mỗi sub-section thành slot. Edit mode wrap mỗi slot trong inline editor; view mode render plain.

`WikiContentBody` không phải component mới — view mode dùng `WikiContentRenderer`, edit mode dùng `TiptapEditor` (body-only, đã có). Cả hai cùng `prose prose-slate max-w-none` để khớp typography.

### Page composition

```
View page (/wiki/[slug])
└─ WikiPageShell
   ├─ header  → WikiPageHeader mode="view"
   ├─ body    → WikiContentRenderer
   ├─ infobox → WikiInfoboxCard mode="view"
   └─ toc     → WikiToc

Edit page (/dashboard/wiki/[id]/edit)
└─ WikiPageShell (cùng layout)
   ├─ header  → WikiPageHeader mode="edit" + LocaleToggle + Settings button
   ├─ body    → TiptapEditor (locale controlled)
   ├─ infobox → WikiInfoboxCard mode="edit"
   ├─ <StickySaveBar />
   └─ <WikiSettingsSheet> (slug + publish chỉ)
```

State: `react-hook-form` provider ở edit page bao toàn bộ subtree. Mọi inline editor lấy `useFormContext<WikiFormValue>()` — không thêm state layer.

## Inline edit components

Mỗi field metadata có một component nhỏ với pattern: **display state** giống public + **edit state** (input/popover) + click-to-toggle. Tất cả nằm trong `components/wiki/inline-infobox/`.

| Field | Display | Edit affordance | Form path |
|---|---|---|---|
| Title | `<h1>` lớn | `EditableTitle` đã có, single-line contenteditable | `title` / `title_vi` |
| Summary | `<p>` muted dưới title | `EditableSummary` mới: click → `<Textarea>` inline, blur save | `summary` / `summary_vi` |
| Image | `<img>` aspect-square | Click → file picker (reuse `uploadWikiImage`); hover hiện X | `metadata.infoboxImage` |
| Category | `<dd>` text | Click → Popover với Select 12 categories | `metadata.category` |
| Stats | `<dl>` KV table | Click row → 2 input; hover row hiện X; cuối "+ Add stat" | `metadata.stats` |
| Location | `<dd>` text | Click → Input theo locale | `metadata.location` / `metadata.location_vi` |
| Tags | row `<Badge>` | Reuse `TagsInput` trong edit mode | `metadata.tags` / `metadata.tags_vi` |
| Related | list `<Link>` | Reuse `RelatedPagesPicker` | `metadata.relatedPages` |
| Body | markdown | Tiptap editor + BubbleMenu nổi khi select | `content` / `content_vi` |

**Empty state**: khi field trống, hover vào card hiện placeholder mờ "+ Add image", "+ Add category", v.v. Khi đã có data, hover row hiện edit icon (mở editor) + remove icon (clear field).

**Locale-scoped fields** (đổi theo toggle EN/VI): title, summary, content, tags, location.
**Shared fields** (chung 2 ngôn ngữ): slug, image, category, stats, related pages.

## EN/VI locale model

- Toggle EN/VI ở header edit page, cạnh title. Mặc định lấy từ `useI18n().locale`.
- Switch toggle → mọi locale-scoped field re-bind sang bản kia. UI luôn 1 ngôn ngữ.
- Tab EN/VI nội bộ trong `TiptapEditor` bị **bỏ** — locale do parent control qua prop. `TiptapEditor` nhận `value: string` + `onChange: (v: string) => void` thay vì object `{en, vi}`.
- Indicator "missing translation": nếu locale hiện tại trống ở title/body, hiện badge nhỏ cạnh field. Body trống có placeholder "Start writing in English…" / "Bắt đầu viết tiếng Việt…".
- "Copy from EN/VI" giữ trong toolbar editor body, áp dụng cho content (không apply tags/title — risk lớn).
- Slug ở Settings sheet vẫn là cặp `slug` + `slug_vi` riêng, không bị toggle.

## Save model

Sticky save bar giữ nguyên hành vi:

- **Save Draft**: yêu cầu `title` + `title_vi` non-empty, slug hợp lệ. `isPublished` không đổi.
- **Publish**: thêm yêu cầu `content` + `content_vi` non-empty. Set `isPublished = true`.
- **Cancel**: reset form về initial. Nếu dirty, confirm trước.

Validation lỗi → focus tới field lỗi. Nếu lỗi nằm ở slug (chỉ field còn trong Settings sheet), tự mở sheet và highlight slug. Title, summary, body đều inline → scroll + focus.

**Optimistic concurrency** giữ nguyên: client gửi `expectedLatestRevisionId`. 409 → conflict dialog với option Reload / Force overwrite.

**Beforeunload warning** khi `formState.isDirty`. Đã có, không đổi.

**Auto-save không có trong scope** — nếu cần sau, có thể bổ sung mà không phá design.

## Revision snapshot model (backend)

### Schema thay đổi

`WikiRevision` (`server/src/entities/Wiki.WikiRevision.ts`) thêm các cột:

```ts
// Existing
content, content_vi, summary, summary_vi
authorId, wikiId, createdAt

// New — full snapshot
title, title_vi          // text not null
slug, slug_vi            // text not null
metadataJson             // jsonb null
isPublished              // bool not null default false
```

`Wiki` record giữ nguyên các field hiện có để query nhanh và làm "live pointer" tới state mới nhất:

```ts
title, title_vi, slug, slug_vi, metadataJson, isPublished
latestRevisionId  // FK to WikiRevision
```

### Save flow

1. Open transaction.
2. Validate input (slug format, conflict check `expectedLatestRevisionId`).
3. Insert mới `WikiRevision` với toàn bộ snapshot (title/slug/metadata/isPublished + content/summary).
4. Update `Wiki.{title, slug, metadataJson, isPublished, latestRevisionId, updatedAt}` từ revision đó.
5. Commit.

### Migration

- Thêm cột nullable trước, deploy code đọc-fallback (đọc revision trước, nếu null fallback từ Wiki).
- Backfill script: `UPDATE WikiRevision SET title = w.title, slug = w.slug, ...` từ Wiki row tương ứng. Lịch sử title/slug trước đó coi như cùng giá trị "live" hiện tại — accept loss.
- Sau khi backfill xong, set NOT NULL cho `title`, `title_vi`, `slug`, `slug_vi`, `isPublished`. `metadataJson` giữ nullable (có thể null).
- Code save mới ghi đầy đủ ngay khi deploy (không phụ thuộc backfill).

### History & rollback

- `wiki-history.dto.ts` expose snapshot fields trong response.
- `wiki-diff-view.tsx` mở rộng:
  - Title diff: "Title (EN): 'Foo' → 'Foo Bar'"
  - Slug diff tương tự
  - Metadata diff: list các thay đổi (tags +/-, category change, stats change)
  - Body diff giữ nguyên (markdown line diff hiện có)
- Rollback: `wiki-rollback.dto.ts` apply tất cả fields từ revision target, tạo revision mới snapshot lại trạng thái target. Không xóa revisions giữa.

## Create flow (skip wizard)

Bỏ trang `/dashboard/wiki/new`. Button "New wiki" trên list page → POST `/wiki` với stub mode → redirect ngay sang `/dashboard/wiki/{id}/edit`.

### Stub create

`wiki-create.dto.ts` thêm field `stub?: boolean`. Khi `stub === true`:

- Backend bỏ qua validation `title min(1)` và `slug` user-supplied.
- Backend tự generate:
  - `title: ""`, `title_vi: ""`
  - `slug: untitled-{nanoid(6)}`, `slug_vi: khong-ten-{nanoid(6)}`
  - `content: ""`, `content_vi: ""`
  - `isPublished: false`
- Nếu slug collision (rare), retry 3 lần với suffix mới trước khi 500.
- Trả về `WikiDetail` như bình thường, frontend redirect dùng `id`.

Frontend không gửi gì khác ngoài `{ stub: true }` — `lib/wiki/api.ts` thêm helper `createWikiStub()`.

### Edit page với stub

- Title rỗng → `EditableTitle` tự auto-focus, hiện placeholder lớn "Untitled" / "Chưa đặt tên".
- Auto-slug logic giữ nguyên: gõ title → debounce 300ms → cập nhật slug field (chỉ khi user chưa manual chỉnh slug). Lúc save Draft mới persist.
- Save Draft đầu tiên replace stub slug bằng slug có ý nghĩa.

### Eager cleanup

Khi user rời edit page mà cả ba điều kiện đúng:
- `formState.isDirty === false` (không có thay đổi từ initial), **VÀ**
- `title === ""` và `title_vi === ""` (vẫn ở stub state), **VÀ**
- Wiki chưa từng có revision nào ngoài stub creation (`detail.latestRevision.content === ""` và `content_vi === ""`)

→ Frontend gọi DELETE `/wiki/{id}` trước khi điều hướng. Trigger: nút Cancel, click breadcrumb về list, hoặc Next.js router event `routeChangeStart`.

Cancel khi user **đã** nhập gì đó (form dirty hoặc title đã có): không xóa, hành xử như Cancel hiện tại — confirm dialog "Discard changes" rồi router.push về list (stub vẫn còn lại trong DB).

Edge case: user F5 hoặc đóng tab giữa chừng → stub còn lại. Chấp nhận; nếu cần dọn sau, có thể thêm cron job xóa wiki có `title === ""` quá 24h. **Out of scope** cho lần này.

## File structure

### New files (frontend)

```
components/wiki/
├── wiki-page-shell.tsx          # 2-column layout shared
├── wiki-page-header.tsx         # title + summary + byline (modes)
├── editable-summary.tsx         # click-to-edit summary
├── locale-toggle.tsx            # EN/VI toggle ở header edit
└── inline-infobox/
    ├── editable-infobox.tsx
    ├── editable-image-field.tsx
    ├── editable-category-field.tsx
    ├── editable-stats-field.tsx
    ├── editable-location-field.tsx
    ├── editable-tags-field.tsx
    └── editable-related-field.tsx
```

### Refactored files (frontend)

- `components/wiki/wiki-infobox.tsx` → split readonly cells dùng chung; `WikiInfobox` (view) wrap chúng
- `components/wiki/editor/tiptap-editor.tsx` → bỏ tabs EN/VI nội bộ; nhận `value: string` thay vì `{en, vi}`. "Copy from other locale" thành prop callback.
- `components/wiki/wiki-form.tsx` → tái cấu trúc thành layout `WikiPageShell` 2-column; bỏ Tiptap tab header
- `components/wiki/wiki-settings-sheet.tsx` → cắt sections title/summary/metadata, giữ slug + publish status
- `app/(dashboard)/dashboard/wiki/[id]/edit/page.tsx` → render layout mới
- `app/(dashboard)/dashboard/wiki/page.tsx` → button "New wiki" gọi stub create thay vì link `/new`
- `app/wiki/[slug]/page.tsx` → dùng `WikiPageShell` (không đổi UX, chỉ đổi composition)

### Removed files (frontend)

- `app/(dashboard)/dashboard/wiki/new/page.tsx`
- `models/dtos/wiki-create-step1.dto.ts` (chỉ wizard step 1 dùng — đã verify qua grep)

### Backend

- `server/src/entities/Wiki.WikiRevision.ts` — thêm cột
- `server/src/wiki/services/wiki.service.ts` — `update()` ghi snapshot; `create()` hỗ trợ stub
- `server/src/wiki/services/wiki-revision.service.ts` — diff & rollback metadata
- `server/src/wiki/dto/wiki-create.dto.ts` — thêm `stub?: boolean`
- `server/src/wiki/dto/wiki-history.dto.ts` — expose snapshot fields
- Migration MikroORM (`server/src/migrations/`) cho ALTER TABLE + backfill

## Order of work

Tách thành 8 work items, có thể merge từng cái độc lập sau khi backend snapshot xong:

1. **Backend revision snapshot + migration**
   - Thêm cột nullable, deploy, backfill, set NOT NULL.
   - `wiki.service.update()` ghi snapshot vào revision mới.
   - `wiki-history.dto.ts` expose fields. UI history vẫn hoạt động (chỉ bổ sung sau).

2. **Stub create endpoint**
   - `wiki-create.dto.ts` thêm `stub?: boolean`.
   - `wiki.service.create()` xử lý stub mode, generate slug random, retry collision.
   - `lib/wiki/api.ts` thêm `createWikiStub()`.

3. **Layout primitive components**
   - `WikiPageShell`, `WikiPageHeader`.
   - Refactor `WikiInfobox` thành readonly cells reusable + view wrapper.
   - View page (`/wiki/[slug]`) dùng layout mới — verify visual không đổi.

4. **Inline edit components**
   - `EditableSummary`, `LocaleToggle`.
   - `inline-infobox/*` cho 6 fields (image, category, stats, location, tags, related).
   - Mỗi component: display + edit state + form context binding.

5. **Refactor edit page sang layout mới**
   - `WikiForm` chuyển thành layout `WikiPageShell` 2-column.
   - `TiptapEditor` đổi prop signature (`value: string`, `onChange: (v) => void`).
   - Settings sheet rút gọn còn slug + publish.
   - Sticky save bar không đổi.

6. **Bỏ trang new + stub flow trên list**
   - List button "New wiki" gọi `createWikiStub()` → redirect.
   - Edit page xử lý empty title placeholder.
   - Eager cleanup khi Cancel/leave với form không dirty và title vẫn empty.
   - Xóa `/dashboard/wiki/new/page.tsx`.

7. **History UI mở rộng**
   - `wiki-diff-view.tsx` thêm sections diff title/slug/metadata.
   - Rollback apply mọi fields, không chỉ content.

8. **Polish & QA**
   - Mobile layout (infobox collapse trên đầu).
   - Empty state styling cho từng inline field.
   - Visual diff giữa view page và edit page (snapshot test nếu có).

Items 1, 2, 3 có thể parallel. Items 4–6 phụ thuộc 3. Item 7 phụ thuộc 1. Item 8 cuối cùng.

## Risks

- **Backfill cost**: nếu DB có nhiều revision, ALTER TABLE + backfill chạy lâu. Ước tính số rows trước, chạy migration trong maintenance window nếu cần.
- **Stub rác**: user F5/close tab giữa chừng để lại wiki rỗng. Acceptable; cron job dọn ngoài scope.
- **TipTap prop signature change**: nếu có chỗ khác dùng `TiptapEditor` (kiểm tra bằng grep) phải migrate cùng.
- **Visual drift**: nếu edit page và view page chia sẻ component nhưng styling khác (do dark mode, prose width), user sẽ thấy không đồng nhất. Mitigate: dùng cùng `prose` config; visual regression test snapshot nếu có hạ tầng.
- **Inline editor accessibility**: contenteditable + popover edit có thể khó dùng với keyboard/screen reader. Mỗi inline component cần aria-label, focus management rõ ràng. Tối thiểu giữ tab order tự nhiên.

## Out of scope

- Realtime collaborative editing.
- Auto-save.
- Mobile app editor.
- Slug history viewer (chỉ tracked qua revision snapshot, không có UI riêng).
- Cron cleanup stub wiki rỗng quá 24h.
- Migrate khỏi TipTap.

## Open questions

Không còn — đã chốt qua brainstorming.
