import type { Editor } from '@tiptap/react';

interface MarkdownStorage {
  getMarkdown?: () => string;
}

// Returns the editor's current content serialized as markdown.
// Uses tiptap-markdown's storage, which the Markdown extension exposes as `editor.storage.markdown`.
export function getMarkdown(editor: Editor): string {
  const md = (editor.storage as unknown as Record<string, unknown>).markdown as
    | MarkdownStorage
    | undefined;
  if (md && typeof md.getMarkdown === 'function') {
    return md.getMarkdown();
  }
  // Fallback: HTML (should not be reached when Markdown extension is registered)
  return editor.getHTML();
}

// Replace the editor's content with the parsed markdown.
export function setMarkdown(editor: Editor, markdown: string): void {
  editor.commands.setContent(markdown, { emitUpdate: false });
}
