'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { useI18n } from '@/lib/i18/i18n-context';
import { TiptapBubbleMenu } from './tiptap-bubble-menu';
import { SlashCommand } from './slash-command';
import { getMarkdown, setMarkdown } from './tiptap-markdown';
import { attachImageDropAndPaste } from './tiptap-image-upload';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export interface TiptapEditorValue {
  en: string;
  vi: string;
}

interface Props {
  value: TiptapEditorValue;
  onChange: (next: TiptapEditorValue) => void;
  readonly?: boolean;
  onUploadError?: (msg: string) => void;
  // Controlled-locale mode: when provided, the parent decides which language
  // the editor shows. Pair with hideLocaleTabs to suppress the internal tabs
  // and let a page-level toggle drive the locale instead.
  activeLocale?: 'en' | 'vi';
  hideLocaleTabs?: boolean;
}

// Note: TipTap v3's StarterKit bundles Link — we disable it here so the
// separately-imported Link with custom options (openOnClick / autolink) is the
// only registration. Same precaution would apply if StarterKit ever bundled
// Image, Table, or TaskList in the future.
const EXTENSIONS = [
  StarterKit.configure({ link: false }),
  Link.configure({ openOnClick: false, autolink: true }),
  Image.configure({ inline: false, allowBase64: false }),
  Table.configure({ resizable: false }),
  TableRow,
  TableCell,
  TableHeader,
  TaskList,
  TaskItem.configure({ nested: true }),
  Markdown.configure({
    html: false,
    tightLists: true,
    bulletListMarker: '-',
    linkify: true,
    breaks: false,
  }),
  SlashCommand,
];

export function TiptapEditor({
  value,
  onChange,
  readonly = false,
  onUploadError,
  activeLocale,
  hideLocaleTabs = false,
}: Props) {
  const { t } = useI18n();
  // When activeLocale is provided the parent owns the locale; otherwise fall
  // back to internal tab state driven by the editor's own TabsList.
  const [internalTab, setInternalTab] = useState<'en' | 'vi'>('en');
  const activeTab = activeLocale ?? internalTab;
  // Latest-value refs: the useEditor onUpdate closure is created once and would
  // otherwise capture stale value/activeTab. Assigning during render keeps them
  // current for that callback.
  /* eslint-disable react-hooks/refs */
  const valueRef = useRef(value);
  valueRef.current = value;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  /* eslint-enable react-hooks/refs */

  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value[activeTab],
    editable: !readonly,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const md = getMarkdown(editor);
      const tab = activeTabRef.current;
      if (md !== valueRef.current[tab]) {
        onChange({ ...valueRef.current, [tab]: md });
      }
    },
  });

  // Sync external value changes into editor when they don't match the active tab content.
  useEffect(() => {
    if (!editor) return;
    const current = getMarkdown(editor);
    if (current !== value[activeTab]) {
      setMarkdown(editor, value[activeTab]);
    }
  }, [value, activeTab, editor]);

  // Wire up image drop/paste once the editor is ready.
  useEffect(() => {
    if (!editor) return;
    const detach = attachImageDropAndPaste(editor, (msg) => onUploadError?.(msg));
    return detach;
  }, [editor, onUploadError]);

  const switchTab = (next: 'en' | 'vi') => {
    if (!editor || next === activeTab) return;
    const currentMd = getMarkdown(editor);
    if (currentMd !== valueRef.current[activeTab]) {
      onChange({ ...valueRef.current, [activeTab]: currentMd });
    }
    setInternalTab(next);
    setMarkdown(editor, valueRef.current[next]);
  };

  const copyFromOther = () => {
    if (!editor) return;
    const other = activeTab === 'en' ? 'vi' : 'en';
    const otherMd = valueRef.current[other];
    onChange({ ...valueRef.current, [activeTab]: otherMd });
    setMarkdown(editor, otherMd);
  };

  return (
    <div className="rounded-md border bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 px-2">
        {hideLocaleTabs ? (
          <span />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => switchTab(v as "en" | "vi")}
            className="w-auto"
          >
            <TabsList className="h-9 bg-transparent">
              <TabsTrigger value="en">{t("wiki.tab_en")}</TabsTrigger>
              <TabsTrigger value="vi">{t("wiki.tab_vi")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={copyFromOther}
          title="Copy content from the other language"
        >
          {activeTab === "en" ? t("wiki.copy_from_vi") : t("wiki.copy_from_en")}
        </Button>
      </div>
      <EditorContent
        editor={editor}
        className="prose prose-slate dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none"
      />
      <TiptapBubbleMenu editor={editor} />
    </div>
  );
}
