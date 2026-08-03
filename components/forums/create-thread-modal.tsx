"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, Loader2 } from "lucide-react";
import { api } from "@/lib/api/api-client";
import { toast } from "react-toastify";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import { useI18n } from "@/lib/i18/i18n-context";
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
  Undo,
  type EditorConfig,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

interface FormData {
  id?: string;
  title: string;
  slug: string;
  content: string;
  categoryId: string;
  postType: string;
  imageUrl: string | null;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
}

interface Props {
  open: boolean;
  categories: Category[];
  form: FormData;
  setForm: React.Dispatch<
    React.SetStateAction<FormData>
  >;
  onClose: () => void;
  onSubmit: (form: FormData, file: File | null) => Promise<void>;
  title?: string;
  subtitle?: string;
  submitText?: string;
}

const POST_TYPES = [
  "GENERAL",
  "BUG_REPORT",
  "GUIDE",
  "SUGGESTION",
  "FAN_ART",
  "LOOKING_FOR_PARTY",
] as const;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const CK_CONFIG: EditorConfig = {
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
    Undo,
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

export default function CreateThreadModal({
  open,
  categories,
  form,
  setForm,
  onClose,
  onSubmit,
  title,
  subtitle,
  submitText,
}: Props) {
  const { t } = useI18n();

  const [slugTouched, setSlugTouched] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (!open) {
      setSlugTouched(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCatDropdownOpen(false);
      setTypeDropdownOpen(false);
    }
  }, [open]);

  const handleTitleChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setForm((prev) => ({
      ...prev,
      slug: slugify(value),
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("forums.image_too_large") || "Image size must be less than 5MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("forums.invalid_image_type") || "Only JPEG, PNG, and WebP are allowed");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      await onSubmit(form, selectedFile);
    } catch (err) {
      console.error(err);
      toast.error(t("forums.upload_failed") || "Failed to upload thread image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (fileInputRef.current) { fileInputRef.current.value = ""; }
    setForm((prev) => ({
      ...prev,
      imageUrl: "",
    }));
  };

  const handleOpenCat = () => {
    setCatDropdownOpen(prev => !prev);
    setTypeDropdownOpen(false);
  };

  const handleOpenType = () => {
    setTypeDropdownOpen(prev => !prev);
    setCatDropdownOpen(false);
  };

  const canSubmit =
    !!form.title &&
    !!form.categoryId &&
    !!form.postType &&
    !!form.content &&
    !isUploading;

  if (!open) return null;

  const selectedCat = categories.find(c => c.id === form.categoryId);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-5">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0b17] p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">
          {title || t("forums.modal.create_thread") || "Create New Thread"}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          {subtitle || t("forums.modal.create_subtitle") || "Share your thoughts with the community."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Title */}
          <div>
            <Label htmlFor="title" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("forums.modal.title") || "Title"} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t("forums.modal.title_placeholder") || "What's this thread about?"}
              maxLength={200}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              {form.title.length}/200
            </p>
          </div>

          {/* 2. Slug */}
          <div>
            <Label htmlFor="slug" className="text-sm font-medium text-slate-500 dark:text-slate-300">
              {t("forums.modal.slug") || "Slug"} <span className="text-slate-500">({t("forums.modal.auto_generated") || "auto-generated"})</span>
            </Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="thread-slug"
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              {slugTouched
                ? (t("forums.modal.custom_slug") || "Custom slug")
                : (t("forums.modal.auto_slug") || "Auto-generated from title")}
            </p>
          </div>

          {/* 3. Image Upload */}
          <div>
            <Label className="text-sm font-medium text-slate-500 dark:text-slate-300">
              {t("forums.modal.image") || "Image"} <span className="text-slate-500">({t("forums.modal.optional") || "optional"})</span>
            </Label>
            <div className="mt-2 space-y-3">
              {/* Preview */}
              {(previewUrl || form.imageUrl) && (
                <div className="relative rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-300 dark:bg-slate-700 h-auto flex items-center justify-center">
                  <img
                    src={previewUrl || form.imageUrl || undefined}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {/* Upload Area */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="border-slate-700 dark:hover:bg-slate-800 hover:bg-slate-300 text-slate-500 dark:text-slate-300 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("forums.modal.uploading") || "Uploading..."}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {t("forums.modal.choose_image") || "Choose Image"}
                    </>
                  )}
                </Button>

                {(form.imageUrl || selectedFile) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={isUploading}
                    className="border-red-200 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-300 dark:text-red-400 cursor-pointer"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t("forums.modal.remove") || "Remove"}
                  </Button>
                )}
              </div>

              <p className="text-xs text-slate-500">
                {t("forums.modal.image_requirements") || "PNG, JPG, WebP up to 5MB"}
              </p>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* 4. Dropdowns side-by-side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Dropdown */}
            <div className="relative">
              <Label className="text-sm font-medium text-slate-500 dark:text-slate-300">
                {t("forums.modal.category") || "Category"} <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={handleOpenCat}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl dark:focus:border-violet-500 focus:border-violet-500 outline-none text-left"
                >
                  <div className="flex items-center gap-3">
                    {selectedCat ? (
                      <>
                        {selectedCat.iconUrl && !brokenImages[selectedCat.id] ? (
                          <img
                            src={selectedCat.iconUrl}
                            alt={selectedCat.name}
                            className="w-6 h-6 rounded-lg object-cover"
                            onError={() =>
                              setBrokenImages((prev) => ({
                                ...prev,
                                [selectedCat.id]: true,
                              }))
                            }
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                            {selectedCat.name[0]}
                          </div>
                        )}
                        <span>{selectedCat.name}</span>
                      </>
                    ) : (
                      <span className="text-slate-700 dark:text-slate-200">
                        {t("forums.modal.select_category") || "Select Category"}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-xs">▼</span>
                </button>

                {catDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-300 dark:bg-slate-700 border border-slate-700 rounded-xl overflow-hidden shadow-xl max-h-60 overflow-y-auto">
                    {categories.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                        {t("forums.modal.no_categories") || "No categories available"}
                      </div>
                    ) : (
                      categories.map((cat) => (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, categoryId: cat.id }));
                            setCatDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 dark:hover:bg-slate-500 hover:bg-slate-400 text-left transition-colors ${form.categoryId === cat.id ? "bg-violet-300 text-slate-700 dark:bg-violet-500 dark:text-white" : "text-slate-700 dark:text-slate-300"
                            }`}
                        >
                          {cat.iconUrl && !brokenImages[cat.id] ? (
                            <img
                              src={cat.iconUrl}
                              alt={cat.name}
                              className="w-6 h-6 rounded-lg object-cover"
                              onError={() =>
                                setBrokenImages((prev) => ({
                                  ...prev,
                                  [cat.id]: true,
                                }))
                              }
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-lg bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-200">
                              {cat.name[0]}
                            </div>
                          )}
                          <span>{cat.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Post Type Dropdown */}
            <div className="relative">
              <Label className="text-sm font-medium text-slate-500 dark:text-slate-300">
                {t("forums.modal.post_type") || "Post Type"} <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-2">
                <button
                  type="button"
                  onClick={handleOpenType}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl dark:focus:border-violet-500 focus:border-violet-500 outline-none text-left"
                >
                  <span className="text-slate-700 dark:text-slate-200">
                    {form.postType
                      ? (t(`forums.post_type.${form.postType.toLowerCase()}`) || form.postType.replace(/_/g, " "))
                      : (t("forums.modal.select_post_type") || "Select Post Type")}
                  </span>
                  <span className="text-slate-400 text-xs">▼</span>
                </button>

                {typeDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-300 dark:bg-slate-700 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                    {POST_TYPES.map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => {
                          setForm((prev) => ({ ...prev, postType: type }));
                          setTypeDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 dark:hover:bg-slate-500 hover:bg-slate-400 text-left transition-colors ${form.postType === type ? "bg-violet-300 text-slate-700 dark:bg-violet-500 dark:text-white" : "text-slate-700 dark:text-slate-300"
                          }`}
                      >
                        {t(`forums.post_type.${type.toLowerCase()}`) || type.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Content */}
          <div>
            <Label className="text-sm font-medium text-slate-500 dark:text-slate-300">
              {t("forums.modal.content") || "Content"} <span className="text-red-500">*</span>
            </Label>
            <div className="mt-2 rounded-lg border border-slate-700 overflow-hidden text-black">
              <CKEditor
                editor={ClassicEditor}
                config={CK_CONFIG}
                data={form.content}
                onChange={(_evt, editor) => setForm((prev) => ({ ...prev, content: editor.getData() }))}
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-700 hover:bg-red-300 text-slate-500 dark:text-slate-300 cursor-pointer"
            >
              {t("forums.modal.cancel") || "Cancel"}
            </Button>
            <div className={!canSubmit ? "cursor-not-allowed" : "cursor-pointer"}>
              <Button
                type="submit"
                disabled={!canSubmit}
                className={`${canSubmit
                  ? "bg-violet-500 hover:bg-violet-700 dark:text-white cursor-pointer"
                  : "bg-slate-700 text-slate-300"
                  }`}
              >
                {submitText || t("forums.modal.submit") || "Post Thread"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}