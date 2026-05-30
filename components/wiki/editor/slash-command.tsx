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
  // Only trigger when "/" is the first character of its block, so "/" typed
  // mid-sentence stays literal. range.from is the position of the "/" itself;
  // parentOffset === 0 means it begins the block.
  allow: ({ state, range }) => {
    const $from = state.doc.resolve(range.from);
    return $from.parentOffset === 0;
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

    const positionPopup = (
      clientRect: (() => DOMRect | null) | null | undefined,
    ) => {
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
