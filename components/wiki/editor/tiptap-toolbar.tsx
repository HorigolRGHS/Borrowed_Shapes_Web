"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
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
  ListChecks,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Undo2,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface Props {
  editor: Editor | null;
}

interface IconBtnProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  asToggle?: boolean;
}

function IconBtn({
  label,
  active,
  disabled,
  onClick,
  children,
  asToggle = false,
}: IconBtnProps) {
  const trigger = asToggle ? (
    <Toggle
      pressed={!!active}
      disabled={disabled}
      onPressedChange={() => onClick?.()}
      size="sm"
      aria-label={label}
    >
      {children}
    </Toggle>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </Button>
  );
  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function TiptapToolbar({ editor }: Props) {
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkOpen, setLinkOpen] = React.useState(false);

  if (!editor) return null;

  const headingLevel = editor.isActive("heading", { level: 1 })
    ? "1"
    : editor.isActive("heading", { level: 2 })
      ? "2"
      : editor.isActive("heading", { level: 3 })
        ? "3"
        : "";

  const setHeading = (level: string) => {
    const lvl = Number(level);
    if (!lvl) {
      editor.chain().focus().setParagraph().run();
      return;
    }
    editor
      .chain()
      .focus()
      .toggleHeading({ level: lvl as 1 | 2 | 3 })
      .run();
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (url) editor.chain().focus().setLink({ href: url }).run();
    else editor.chain().focus().unsetLink().run();
    setLinkOpen(false);
    setLinkUrl("");
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
        <ToggleGroup
          type="single"
          value={headingLevel}
          onValueChange={setHeading}
          aria-label="Heading level"
        >
          <ToggleGroupItem value="1" aria-label="Heading 1">
            <Heading1 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="2" aria-label="Heading 2">
            <Heading2 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="3" aria-label="Heading 3">
            <Heading3 className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <IconBtn
          label="Bold"
          asToggle
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Italic"
          asToggle
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Strike"
          asToggle
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Inline code"
          asToggle
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="h-4 w-4" />
        </IconBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <IconBtn
          label="Bullet list"
          asToggle
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Numbered list"
          asToggle
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Task list"
          asToggle
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListChecks className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Quote"
          asToggle
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Code block"
          asToggle
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code className="h-4 w-4" />
        </IconBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
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
            </TooltipTrigger>
            <TooltipContent>Insert link</TooltipContent>
          </Tooltip>
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

        <IconBtn
          label="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Insert table"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon className="h-4 w-4" />
        </IconBtn>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <IconBtn
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </IconBtn>
        <IconBtn
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </IconBtn>
      </div>
    </TooltipProvider>
  );
}
