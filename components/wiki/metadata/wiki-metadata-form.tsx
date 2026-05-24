"use client";

import * as React from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TagsInput } from "./tags-input";
import { StatsInput } from "./stats-input";
import { RelatedPagesPicker } from "./related-pages-picker";
import { uploadWikiImage } from "@/lib/wiki/api";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  WIKI_CATEGORIES,
  type WikiCategory,
  type WikiMetadata,
} from "@/models/dtos/wiki-metadata.dto";

interface Props {
  value: WikiMetadata;
  onChange: (next: WikiMetadata) => void;
  excludeSlug?: string;
  locale: "en" | "vi";
}

export function WikiMetadataForm({
  value,
  onChange,
  excludeSlug,
  locale,
}: Props) {
  const { t } = useI18n();
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const patch = (p: Partial<WikiMetadata>) => onChange({ ...value, ...p });

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const onUploadClick = () => fileInputRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const r = await uploadWikiImage(file);
      patch({ infoboxImage: r.url });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? t("wiki.metadata.upload_failed");
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category */}
      <div className="space-y-1.5">
        <Label>{t("wiki.metadata.category_label")}</Label>
        <Select
          value={value.category ?? ""}
          onValueChange={(v) =>
            patch({ category: v ? (v as WikiCategory) : undefined })
          }
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder={t("wiki.metadata.category_none")} />
          </SelectTrigger>
          <SelectContent>
            {WIKI_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`wiki.metadata.category.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Infobox image */}
      <div className="space-y-1.5">
        <Label>{t("wiki.metadata.infobox_image")}</Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onFile}
          className="hidden"
        />
        {value.infoboxImage ? (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.infoboxImage}
              alt=""
              className="h-32 w-32 object-contain rounded border bg-muted"
            />
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground truncate">
                {value.infoboxImage}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onUploadClick}
                  disabled={uploading}
                >
                  {t("wiki.metadata.replace_button")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => patch({ infoboxImage: undefined })}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t("wiki.metadata.remove_button")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onUploadClick}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploading
                ? t("wiki.metadata.uploading")
                : t("wiki.metadata.upload_button")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("wiki.metadata.upload_hint")}
            </span>
          </div>
        )}
        {uploadError && (
          <Alert variant="destructive">
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Tags */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("wiki.metadata.tags_en")}</Label>
          <TagsInput
            value={value.tags ?? []}
            onChange={(tags) => patch({ tags })}
            placeholder={t("wiki.metadata.tag_placeholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("wiki.metadata.tags_vi")}</Label>
          <TagsInput
            value={value.tags_vi ?? []}
            onChange={(tags_vi) => patch({ tags_vi })}
            placeholder={t("wiki.metadata.tag_placeholder")}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-1.5">
        <Label>{t("wiki.metadata.stats")}</Label>
        <StatsInput
          value={value.stats ?? {}}
          onChange={(stats) => patch({ stats })}
        />
      </div>

      {/* Location */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("wiki.metadata.location_en")}</Label>
          <Input
            value={value.location ?? ""}
            onChange={(e) => patch({ location: e.target.value })}
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("wiki.metadata.location_vi")}</Label>
          <Input
            value={value.location_vi ?? ""}
            onChange={(e) => patch({ location_vi: e.target.value })}
            maxLength={120}
          />
        </div>
      </div>

      {/* Related pages */}
      <div className="space-y-1.5">
        <Label>{t("wiki.metadata.related_pages")}</Label>
        <RelatedPagesPicker
          value={value.relatedPages ?? []}
          onChange={(relatedPages) => patch({ relatedPages })}
          excludeSlug={excludeSlug}
          locale={locale}
        />
      </div>
    </div>
  );
}
