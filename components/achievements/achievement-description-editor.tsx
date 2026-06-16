"use client";

// Editor HTML cho field description cua Achievements. Migrate tu
// @ckeditor/ckeditor5-build-classic@41 sang umbrella ckeditor5@48.
// LUU Y: achievements luu HTML (getData/setData tra ve HTML), KHONG dung
// Markdown plugin — khac voi wiki editor.
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  BlockQuote,
  Table,
  TableToolbar,
  List,
  Indent,
  RemoveFormat,
  type EditorConfig,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

const CONFIG: EditorConfig = {
  licenseKey: "GPL",
  plugins: [
    Essentials,
    Paragraph,
    Heading,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Link,
    BlockQuote,
    Table,
    TableToolbar,
    List,
    Indent,
    RemoveFormat,
  ],
  toolbar: [
    "heading",
    "|",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "link",
    "blockQuote",
    "insertTable",
    "bulletedList",
    "numberedList",
    "|",
    "outdent",
    "indent",
    "|",
    "undo",
    "redo",
    "removeFormat",
  ],
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells"],
  },
};

interface Props {
  data: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
}

export function AchievementDescriptionEditor({ data, onChange, onBlur }: Props) {
  return (
    <CKEditor
      editor={ClassicEditor}
      data={data}
      config={CONFIG}
      onChange={(_evt, editor) => onChange(editor.getData())}
      onBlur={() => onBlur?.()}
    />
  );
}
