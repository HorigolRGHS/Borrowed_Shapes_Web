# TipTap Bubble Menu + Slash Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wiki editor's fixed toolbar with a selection bubble menu (inline formatting + block conversion) and a `/` slash-command insert menu.

**Architecture:** Remove `<TiptapToolbar>` from `tiptap-editor.tsx`. Add a `BubbleMenu` (from `@tiptap/react/menus`) rendered alongside `<EditorContent>`, shown only on non-empty text selections. Add a custom `slashCommand` TipTap extension built on `@tiptap/suggestion`, rendering a React popup via `ReactRenderer` + `@floating-ui/dom` positioning. Undo/redo move to keyboard shortcuts.

**Tech Stack:** TipTap v3.23.6, React 19, Next.js 16, Tailwind v4, shadcn/ui, `@tiptap/suggestion` (new dep), `@floating-ui/dom` (already transitive), lucide-react icons.

**Verification note:** This repo has **no frontend test runner** (per CLAUDE.md). There is no Jest/Vitest for the Next.js app. Therefore tasks use `npm run lint` + manual browser verification instead of automated TDD. Do not claim frontend tests pass.

---

## File Structure

- `components/wiki/editor/tiptap-editor.tsx` — **Modify.** Remove toolbar import + render; register `SlashCommand` in `EXTENSIONS`; render `<TiptapBubbleMenu editor={editor} />` after `<EditorContent>`.
- `components/wiki/editor/tiptap-bubble-menu.tsx` — **Create.** The selection bubble menu (inline marks + link popover + heading/list conversion).
- `components/wiki/editor/slash-command.tsx` — **Create.** The `SlashCommand` TipTap extension, the command item list, the React popup component, and the `ReactRenderer` lifecycle wiring.
- `components/wiki/editor/tiptap-toolbar.tsx` — **Delete.** No longer referenced.

---

## Task 1: Install the suggestion dependency

**Files:**
- Modify: `package.json` (dependencies), `package-lock.json`

- [ ] **Step 1: Install `@tiptap/suggestion` pinned to the matching minor**

The other `@tiptap/*` packages are `^3.23.6`. Install the same range so versions stay aligned.

Run:
```bash
npm install @tiptap/suggestion@^3.23.6
```
Expected: `package.json` gains `"@tiptap/suggestion": "^3.23.6"` under `dependencies`; install completes without peer-dependency errors.

- [ ] **Step 2: Verify it resolved to a 3.23.x version**

Run:
```bash
node -e "console.log(require('@tiptap/suggestion/package.json').version)"
```
Expected: prints a `3.23.x` (or compatible `3.x`) version string.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(wiki): add @tiptap/suggestion for slash command"
```

---

## Task 2: Create the bubble menu component

**Files:**
- Create: `components/wiki/editor/tiptap-bubble-menu.tsx`

- [ ] **Step 1: Write the bubble menu component**

This reuses the inline-mark + link-popover logic from the old toolbar, plus heading/list conversion. It uses `BubbleMenu` from `@tiptap/react/menus` and only shows on a non-empty text selection that is not inside an image or code block.

Create `components/wiki/editor/tiptap-bubble-menu.tsx`:

```tsx
"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Strikethrough,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface Props {
  editor: Editor | null;
}

export function TiptapBubbleMenu({ editor }: Props) {
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkOpen, setLinkOpen] = React.useState(false);

  if (!editor) return null;

  const applyLink = () => {
    const url = linkUrl.trim();
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
    setLinkOpen(false);
    setLinkUrl("");
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top" }}
      shouldShow={({ editor, state, from, to }) => {
        if (!editor.isEditable) return false;
        if (from === to) return false; // empty selection
        if (editor.isActive("image") || editor.isActive("codeBlock")) {
          return false;
        }
        // Ensure the selection actually contains text.
        const text = state.doc.textBetween(from, to, " ").trim();
        return text.length > 0;
      }}
      className="flex items-center gap-0.5 rounded-md border bg-popover p-1 shadow-md"
    >
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
      >
        <Code className="h-4 w-4" />
      </Toggle>

      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Insert link"
            className={editor.isActive("link") ? "bg-accent" : ""}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
              }}
            />
            <Button type="button" size="sm" onClick={applyLink}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        aria-label="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() =>
          editor.chain().focus().toggleBulletList().run()
        }
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() =>
          editor.chain().focus().toggleOrderedList().run()
        }
        aria-label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
    </BubbleMenu>
  );
}
```

- [ ] **Step 2: Lint the new file**

Run:
```bash
npm run lint
```
Expected: no errors for `components/wiki/editor/tiptap-bubble-menu.tsx`. (Pre-existing warnings elsewhere are fine; do not introduce new ones in this file.)

- [ ] **Step 3: Commit**

```bash
git add components/wiki/editor/tiptap-bubble-menu.tsx
git commit -m "feat(wiki): add tiptap selection bubble menu"
```

---

## Task 3: Create the slash command extension + popup

**Files:**
- Create: `components/wiki/editor/slash-command.tsx`

- [ ] **Step 1: Write the slash command module**

This defines: the `SlashItem` type, the static `SLASH_ITEMS` list (English labels + keyword filter), the `SlashMenu` React popup (keyboard navigable), and the `SlashCommand` extension wiring `Suggestion` + `ReactRenderer` + `@floating-ui/dom` positioning.

Key behaviors:
- Trigger char `/`, only when the current block is empty (`allow` checks the `$from` parent is empty), so `/` mid-text is literal.
- `command` deletes the typed `/query` `range` then runs the item's action.
- Popup positions against the suggestion `clientRect` using `computePosition` with `offset`/`flip`/`shift`.
- `↑`/`↓` move selection, `Enter` runs it, `Esc` closes.

Create `components/wiki/editor/slash-command.tsx`:

```tsx
"use client";

import * as React from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, {
  type SuggestionOptions,
  type SuggestionProps,
  type SuggestionKeyDownProps,
} from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import { computePosition, flip, shift, offset } from "@floating-ui/dom";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Table as TableIcon,
  Minus,
} from "lucide-react";

interface SlashItem {
  title: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
  command: (props: { editor: Editor; range: Range }) => void;
}

const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Heading 1",
    keywords: ["h1", "title", "heading"],
    icon: Heading1,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    keywords: ["h2", "subtitle", "heading"],
    icon: Heading2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    keywords: ["h3", "heading"],
    icon: Heading3,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bullet list",
    keywords: ["ul", "unordered", "bullet", "list"],
    icon: List,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    keywords: ["ol", "ordered", "number", "list"],
    icon: ListOrdered,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task list",
    keywords: ["todo", "task", "checkbox", "list"],
    icon: ListChecks,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    keywords: ["blockquote", "quote"],
    icon: Quote,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    keywords: ["code", "pre", "snippet"],
    icon: Code,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Table",
    keywords: ["table", "grid"],
    icon: TableIcon,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Horizontal rule",
    keywords: ["hr", "divider", "rule", "separator"],
    icon: Minus,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];

interface SlashMenuProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

export interface SlashMenuHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

const SlashMenu = React.forwardRef<SlashMenuHandle, SlashMenuProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = React.useState(0);

    React.useEffect(() => setSelected(0), [items]);

    React.useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelected((s) => (s + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelected((s) => (s + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selected];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="z-50 w-56 rounded-md border bg-popover p-1 text-sm text-muted-foreground shadow-md">
          <div className="px-2 py-1.5">No results</div>
        </div>
      );
    }

    return (
      <div className="z-50 w-56 overflow-hidden rounded-md border bg-popover p-1 shadow-md">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm ${
                index === selected
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              }`}
              onMouseEnter={() => setSelected(index)}
              onClick={() => command(item)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>
    );
  },
);
SlashMenu.displayName = "SlashMenu";

const suggestionConfig: Omit<SuggestionOptions<SlashItem>, "editor"> = {
  char: "/",
  // Only trigger on an empty block so "/" mid-sentence stays literal.
  allow: ({ state, range }) => {
    const $from = state.doc.resolve(range.from);
    const isEmptyBlock = $from.parent.content.size === 0;
    return isEmptyBlock;
  },
  items: ({ query }) => {
    const q = query.toLowerCase().trim();
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter((item) => {
      const haystack = [item.title.toLowerCase(), ...item.keywords].join(" ");
      return haystack.includes(q);
    });
  },
  command: ({ editor, range, props }) => {
    props.command({ editor, range });
  },
  render: () => {
    let component: ReactRenderer<SlashMenuHandle, SlashMenuProps>;
    let popup: HTMLDivElement | null = null;

    const positionPopup = (clientRect: (() => DOMRect | null) | null | undefined) => {
      if (!popup || !clientRect) return;
      const rect = clientRect();
      if (!rect) return;
      const virtualEl = {
        getBoundingClientRect: () => rect,
      };
      computePosition(virtualEl, popup, {
        placement: "bottom-start",
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        if (!popup) return;
        Object.assign(popup.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    };

    return {
      onStart: (props: SuggestionProps<SlashItem>) => {
        component = new ReactRenderer(SlashMenu, {
          props: {
            items: props.items,
            command: (item: SlashItem) => props.command(item),
          },
          editor: props.editor,
        });
        popup = document.createElement("div");
        popup.style.position = "absolute";
        popup.style.top = "0";
        popup.style.left = "0";
        popup.appendChild(component.element);
        document.body.appendChild(popup);
        positionPopup(props.clientRect);
      },
      onUpdate: (props: SuggestionProps<SlashItem>) => {
        component.updateProps({
          items: props.items,
          command: (item: SlashItem) => props.command(item),
        });
        positionPopup(props.clientRect);
      },
      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === "Escape") {
          popup?.remove();
          popup = null;
          return true;
        }
        return component.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        popup?.remove();
        popup = null;
        component?.destroy();
      },
    };
  },
};

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...suggestionConfig,
      }),
    ];
  },
});
```

- [ ] **Step 2: Lint the new file**

Run:
```bash
npm run lint
```
Expected: no errors for `components/wiki/editor/slash-command.tsx`. If the linter flags `any`, confirm none was introduced; the typed `SuggestionProps<SlashItem>` / `SlashItem` signatures above avoid `any`.

- [ ] **Step 3: Commit**

```bash
git add components/wiki/editor/slash-command.tsx
git commit -m "feat(wiki): add tiptap slash command insert menu"
```

---

## Task 4: Wire menus into the editor, remove the toolbar

**Files:**
- Modify: `components/wiki/editor/tiptap-editor.tsx`
- Delete: `components/wiki/editor/tiptap-toolbar.tsx`

- [ ] **Step 1: Register `SlashCommand`, drop the toolbar import, add the bubble menu**

In `components/wiki/editor/tiptap-editor.tsx`:

Replace the toolbar import line:
```tsx
import { TiptapToolbar } from './tiptap-toolbar';
```
with:
```tsx
import { TiptapBubbleMenu } from './tiptap-bubble-menu';
import { SlashCommand } from './slash-command';
```

Add `SlashCommand` to the end of the `EXTENSIONS` array (after the `Markdown.configure({...})` entry, before the closing `]`):
```tsx
  SlashCommand,
```

Replace this block:
```tsx
      <TiptapToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-slate dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none"
      />
```
with:
```tsx
      <EditorContent
        editor={editor}
        className="prose prose-slate dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none"
      />
      <TiptapBubbleMenu editor={editor} />
```

- [ ] **Step 2: Delete the old toolbar file**

Run:
```bash
git rm components/wiki/editor/tiptap-toolbar.tsx
```
Expected: file removed and staged for deletion.

- [ ] **Step 3: Confirm nothing else imports the toolbar**

Use Grep (not shell) for `tiptap-toolbar` across the repo.
Expected: no remaining references. If any exist, they must be updated/removed before continuing.

- [ ] **Step 4: Lint**

Run:
```bash
npm run lint
```
Expected: no new errors. Unused imports (`Tabs`/`Button` etc.) in `tiptap-editor.tsx` are still used by the locale header, so they should remain.

- [ ] **Step 5: Commit**

```bash
git add components/wiki/editor/tiptap-editor.tsx
git commit -m "feat(wiki): use bubble menu + slash command, remove fixed toolbar"
```

---

## Task 5: Manual browser verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run (background): `npm run dev`
Expected: frontend on http://localhost:3000, backend on 3001. Wait for "Ready".

- [ ] **Step 2: Open a wiki edit page with the editor**

Navigate to a wiki edit page that renders `TiptapEditor` (e.g. via the dashboard wiki list → edit). Log in as admin if prompted (see memory: dev login).

- [ ] **Step 3: Verify the bubble menu**

- Select a run of text → bubble menu appears above the selection.
- Toggle Bold, Italic, Strike, Inline code → formatting applies and the toggle reflects active state.
- Click Link → popover opens; enter a URL + Apply → selection becomes a link; reopen + clear → link removed.
- With selection, click Heading 1/2/3, Bullet, Numbered → block converts.
- Collapse the selection (click elsewhere) → menu disappears.
- Select inside a code block → menu does NOT appear.

- [ ] **Step 4: Verify the slash command**

- On an empty line, type `/` → menu appears at the cursor with all 10 items.
- Type `head` → list narrows to headings; `table` → Table; nonsense → "No results".
- `↑`/`↓` move the highlight; `Enter` inserts the highlighted block; the typed `/query` is removed.
- `Esc` closes the menu without inserting.
- Type `a/b` mid-sentence → `/` stays literal, no menu.

- [ ] **Step 5: Verify shortcuts + round-trip**

- Ctrl+Z undoes the last block insert; Ctrl+Y (or Ctrl+Shift+Z) redoes.
- Markdown shortcuts still work (`# ` → H1, `- ` → bullet, `> ` → quote).
- Switch locale tab (EN/VI) and back → content persists; save and reload → markdown round-trips unchanged.

- [ ] **Step 6: Final lint**

Run:
```bash
npm run lint
```
Expected: clean (no new errors introduced by this work).

> If any manual step fails, fix the relevant component and re-verify before marking this task complete. Do not claim the feature works without having exercised it in the browser.

---

## Self-Review Notes

- **Spec coverage:** Toolbar removal (Task 4), bubble menu inline+link+heading/list (Task 2), slash command with all 10 blocks English-only (Task 3), undo/redo via shortcuts (verified Task 5 Step 5), new dep (Task 1). All spec sections mapped.
- **Type consistency:** `SlashItem`, `SlashMenuHandle`, `SlashMenuProps` defined once in Task 3 and reused consistently; `command({ editor, range })` signature matches between `SLASH_ITEMS` entries and `suggestionConfig.command`.
- **No placeholders:** all code steps contain full source.
