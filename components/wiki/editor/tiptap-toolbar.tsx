'use client';

import type { Editor } from '@tiptap/react';

interface Props {
  editor: Editor | null;
}

interface ButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function Btn({ active, disabled, onClick, title, children }: ButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`px-2 py-1 text-sm rounded border ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
      } disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

export function TiptapToolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 p-2 bg-gray-50">
      <Btn
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >H1</Btn>
      <Btn
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >H2</Btn>
      <Btn
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >H3</Btn>
      <span className="mx-1 h-5 w-px bg-gray-300" />
      <Btn
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      ><b>B</b></Btn>
      <Btn
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      ><i>I</i></Btn>
      <Btn
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strike"
      ><s>S</s></Btn>
      <Btn
        active={editor.isActive('code')}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >{'<>'}</Btn>
      <span className="mx-1 h-5 w-px bg-gray-300" />
      <Btn
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >• List</Btn>
      <Btn
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >1. List</Btn>
      <Btn
        active={editor.isActive('taskList')}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list"
      >☑ List</Btn>
      <Btn
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >&ldquo; Quote</Btn>
      <Btn
        active={editor.isActive('codeBlock')}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code block"
      >Code</Btn>
      <span className="mx-1 h-5 w-px bg-gray-300" />
      <Btn
        onClick={() => {
          const url = window.prompt('URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else editor.chain().focus().unsetLink().run();
        }}
        active={editor.isActive('link')}
        title="Link"
      >🔗</Btn>
      <Btn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >━</Btn>
      <Btn
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert table"
      >Table</Btn>
      <span className="mx-1 h-5 w-px bg-gray-300" />
      <Btn
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
      >↶</Btn>
      <Btn
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
      >↷</Btn>
    </div>
  );
}
