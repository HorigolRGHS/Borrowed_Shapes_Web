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
import { TiptapToolbar } from './tiptap-toolbar';
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
];

export function TiptapEditor({ value, onChange, readonly = false, onUploadError }: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'en' | 'vi'>('en');
  const valueRef = useRef(value);
  valueRef.current = value;
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setActiveTab(next);
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
      <TiptapToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-slate dark:prose-invert max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
