"use client";

import { useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadWikiImage } from "@/lib/wiki/api";
import { useI18n } from "@/lib/i18/i18n-context";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

export function EditableImageField({ wikiId }: { wikiId: string }) {
  const { t } = useI18n();
  const form = useFormContext<WikiFormValue>();
  const url = useWatch({ control: form.control, name: "metadata.infoboxImage" });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const r = await uploadWikiImage(file, wikiId);
      form.setValue("metadata.infoboxImage", r.url, { shouldDirty: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? t("wiki.metadata.upload_failed");
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const remove = () =>
    form.setValue("metadata.infoboxImage", undefined, { shouldDirty: true });

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onFile}
        className="hidden"
      />
      {url ? (
        <div className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="aspect-square w-full rounded-md bg-muted object-contain"
          />
          <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-2 bg-black/40 rounded-md">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              {t("wiki.metadata.replace_button")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={uploading}
              onClick={remove}
            >
              <X className="h-3 w-3 mr-1" />
              {t("wiki.metadata.remove_button")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square w-full rounded-md border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex flex-col items-center justify-center gap-2 hover:bg-muted/40 text-muted-foreground"
        >
          <Upload className="h-6 w-6" />
          <span className="text-xs">
            {uploading
              ? t("wiki.metadata.uploading")
              : t("wiki.metadata.upload_button")}
          </span>
        </button>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
