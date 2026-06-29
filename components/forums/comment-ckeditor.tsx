"use client";

import { useEffect, useRef } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Bold,
  Italic,
  Underline,
  Link,
  List,
  RemoveFormat,
  type EditorConfig,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

const CONFIG: EditorConfig = {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Bold,
    Italic,
    Underline,
    Link,
    List,
    RemoveFormat,
  ],
  toolbar: [
    "bold",
    "italic",
    "underline",
    "link",
    "|",
    "bulletedList",
    "numberedList",
    "|",
    "undo",
    "redo",
    "removeFormat",
  ],
};

interface CommentCKEditorProps {
  value: string;
  onChange: (html: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CommentCKEditor({
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
}: CommentCKEditorProps) {
  const editorRef = useRef<any>(null);
  const isSettingData = useRef(false);

  // Sync value from outside (e.g. when cleared)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const current = editor.getData();
    if (current !== value) {
      isSettingData.current = true;
      editor.setData(value);
      isSettingData.current = false;
    }
  }, [value]);

  return (
    <div className="comment-ck-editor prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 border rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all [&_.ck-editor__editable]:min-h-[60px] [&_.ck-editor__editable]:max-h-[200px] [&_.ck-editor__editable]:px-4 [&_.ck-editor__editable]:py-2">
      <CKEditor
        editor={ClassicEditor}
        config={{
          ...CONFIG,
          placeholder: placeholder || "",
        }}
        data={value}
        disabled={disabled}
        onReady={(editor) => {
          editorRef.current = editor;
          editor.editing.view.document.on("keydown", (evt, data) => {
            if (data.domEvent.key === "Enter" && !data.domEvent.shiftKey) {
              data.preventDefault();
              evt.stop();
              onSend();
            }
          });
        }}
        onChange={(_evt, editor) => {
          if (isSettingData.current) return;
          onChange(editor.getData());
        }}
      />
    </div>
  );
}
