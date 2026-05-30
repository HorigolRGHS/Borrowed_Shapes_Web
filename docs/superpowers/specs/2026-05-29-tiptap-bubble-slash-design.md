# TipTap editor: bubble menu + slash command (remove fixed toolbar)

Date: 2026-05-29
Status: Approved (design)

## Goal

Replace the always-visible toolbar in the wiki WYSIWYG editor with a cleaner, Notion-like interaction:

- A **bubble menu** that pops up only when text is selected, offering inline formatting and quick block conversions.
- A **slash command** menu (`/` on an empty line) for inserting blocks.
- No fixed toolbar bar above the editor.

Labels and filter keywords for the slash menu are **English only**.

## Context

Editor lives in `components/wiki/editor/tiptap-editor.tsx`. Today it renders `<TiptapToolbar editor={editor} />` (file `tiptap-toolbar.tsx`) between the locale-tab header and `<EditorContent>`. TipTap v3.23.6, React 19.

The toolbar currently exposes: Heading 1/2/3, Bold, Italic, Strike, Inline code, Bullet/Numbered/Task list, Quote, Code block, Link (popover), Horizontal rule, Insert table, Undo, Redo.

## Design

### 1. Remove the fixed toolbar

- Delete the `<TiptapToolbar>` render from `tiptap-editor.tsx`.
- Delete `components/wiki/editor/tiptap-toolbar.tsx` (no longer referenced).
- Keep the locale-tab header row and the "copy from other language" button unchanged.

### 2. Bubble menu — `tiptap-bubble-menu.tsx` (new)

- Use `BubbleMenu` from `@tiptap/react/menus`.
- Contents (operate on the current selection):
  - Inline marks: Bold, Italic, Strike, Inline code
  - Link: popover to enter/clear URL (reuse logic from old toolbar)
  - Block conversion of the selected block: Heading 1/2/3, Bullet list, Numbered list
- `shouldShow`: show only when the selection is non-empty text, the editor is editable, and the selection is not inside an image node or a code block (formatting marks don't apply there).
- Reuse the existing `IconBtn` + Tooltip + Toggle styling pattern so the popup matches the app.

### 3. Slash command — `slash-command.tsx` + extension (new)

- New custom `Extension` ("slashCommand") built on the `Suggestion` ProseMirror plugin from `@tiptap/suggestion`.
- Trigger char `/`; only active when the current block is empty (so `/` typed mid-text is literal).
- Item list (English labels + English keyword filter):
  - Heading 1, Heading 2, Heading 3
  - Bullet list, Numbered list, Task list
  - Quote, Code block
  - Table (inserts 3×3 with header row), Horizontal rule
- Each item runs the matching `editor.chain().focus()...run()` command, first deleting the typed `/query` range (via `props.range`).
- Render the popup with React (a small list component) positioned at the cursor. Keyboard nav: ↑/↓ to move, Enter to select, Esc to close. Use a lightweight positioning approach (floating element anchored to the suggestion client rect) consistent with TipTap's suggestion `render` lifecycle (`onStart`/`onUpdate`/`onKeyDown`/`onExit`).

### 4. Undo/Redo and shortcuts

- Drop Undo/Redo buttons from the UI. StarterKit keeps Ctrl+Z / Ctrl+Y (and Cmd on Mac) working.
- Existing markdown input rules (`# `, `- `, `> `, etc.) remain available as an alternative to the slash menu.

## Dependencies

- Add `@tiptap/suggestion@^3.23.6` (must match the other `@tiptap/*` versions). `@tiptap/react/menus` already ships with the installed `@tiptap/react`.

## Files

- `components/wiki/editor/tiptap-editor.tsx` — remove toolbar render, add `<TiptapBubbleMenu>`, register slash-command extension in `EXTENSIONS`.
- `components/wiki/editor/tiptap-bubble-menu.tsx` — new.
- `components/wiki/editor/slash-command.tsx` — new (extension + React popup/renderer).
- `components/wiki/editor/tiptap-toolbar.tsx` — delete.

## Testing / verification

- No frontend test runner is configured in this repo, so verification is manual in the browser:
  - Select text → bubble menu appears; Bold/Italic/Strike/code/link/heading/list all toggle correctly; menu hides on blur/empty selection.
  - Empty line → type `/` → menu appears; arrow keys + Enter insert the right block; typing narrows the list; Esc closes; `/` mid-sentence stays literal.
  - Ctrl+Z / Ctrl+Y still undo/redo.
  - Markdown content round-trips (the `getMarkdown`/`setMarkdown` path is untouched).
- Run `npm run lint` for the frontend.

## Out of scope

- Bilingual slash labels/keywords (English only, per decision).
- Any change to markdown serialization, image upload, or locale-tab behavior.
