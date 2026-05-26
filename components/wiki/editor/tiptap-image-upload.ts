import type { Editor } from '@tiptap/react';
import { uploadWikiImage } from '@/lib/wiki/api';

const ALLOWED_PASTE_DROP_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export async function handleEditorImageUpload(
  editor: Editor,
  file: File,
  onError?: (msg: string) => void,
): Promise<void> {
  if (!ALLOWED_PASTE_DROP_MIMES.has(file.type)) {
    onError?.('Unsupported image type');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    onError?.('Image exceeds 5MB');
    return;
  }
  try {
    const result = await uploadWikiImage(file);
    editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
  } catch (err: unknown) {
    const message =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      'Upload failed';
    onError?.(message);
  }
}

export function attachImageDropAndPaste(
  editor: Editor,
  onError: (msg: string) => void,
): () => void {
  const view = editor.view;
  const dom = view.dom as HTMLElement;

  const onDrop = (e: DragEvent) => {
    if (!e.dataTransfer?.files?.length) return;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ALLOWED_PASTE_DROP_MIMES.has(f.type),
    );
    if (files.length === 0) return;
    e.preventDefault();
    files.forEach((f) => handleEditorImageUpload(editor, f, onError));
  };

  const onPaste = (e: ClipboardEvent) => {
    if (!e.clipboardData?.files?.length) return;
    const files = Array.from(e.clipboardData.files).filter((f) =>
      ALLOWED_PASTE_DROP_MIMES.has(f.type),
    );
    if (files.length === 0) return;
    e.preventDefault();
    files.forEach((f) => handleEditorImageUpload(editor, f, onError));
  };

  dom.addEventListener('drop', onDrop);
  dom.addEventListener('paste', onPaste);

  return () => {
    dom.removeEventListener('drop', onDrop);
    dom.removeEventListener('paste', onPaste);
  };
}
