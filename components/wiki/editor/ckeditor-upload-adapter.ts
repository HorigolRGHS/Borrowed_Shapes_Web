import type {
  FileLoader,
  UploadAdapter,
  UploadResponse,
} from "ckeditor5";
import { uploadWikiImage } from "@/lib/wiki/api";
import { getApiErrorMessage, type ApiError } from "@/lib/wiki/http";

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024;

// UploadAdapter bọc uploadWikiImage. Resolve { default: url } để CKEditor chèn
// <img src=url>. onError nhận message để surface lên UI (toast/alert ở parent).
class WikiUploadAdapter implements UploadAdapter {
  constructor(
    private loader: FileLoader,
    private wikiId: string,
    private onError?: (msg: string) => void,
  ) {}

  async upload(): Promise<UploadResponse> {
    const file = await this.loader.file;
    if (!file) {
      const msg = "No file to upload";
      this.onError?.(msg);
      throw new Error(msg);
    }
    if (!ALLOWED_MIMES.has(file.type)) {
      const msg = "Unsupported image type";
      this.onError?.(msg);
      throw new Error(msg);
    }
    if (file.size > MAX_BYTES) {
      const msg = "Image exceeds 5MB";
      this.onError?.(msg);
      throw new Error(msg);
    }
    try {
      const result = await uploadWikiImage(file, this.wikiId);
      return { default: result.url };
    } catch (err) {
      const msg = getApiErrorMessage(err as ApiError, "Upload failed");
      this.onError?.(msg);
      throw new Error(msg);
    }
  }

  abort(): void {
    // uploadWikiImage không expose cancel token; no-op.
  }
}

// Plugin function: đăng ký factory adapter vào FileRepository của editor.
// Dùng kiểu structural (có .plugins.get) để tránh phụ thuộc type Editor cụ thể.
export function createWikiUploadPlugin(
  onError: ((msg: string) => void) | undefined,
  wikiId: string,
) {
  return function WikiUploadPlugin(editor: {
    plugins: {
      get: (name: string) => {
        createUploadAdapter?: (loader: FileLoader) => UploadAdapter;
      };
    };
  }) {
    editor.plugins.get("FileRepository").createUploadAdapter = (
      loader: FileLoader,
    ) => new WikiUploadAdapter(loader, wikiId, onError);
  };
}
