"use client";

import { Controller, useFormContext } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { I18nFormMessage } from "@/components/ui/i18n-form-message";
import { SlugEditRow } from "./slug-edit-row";
import { WikiMetadataForm } from "./metadata/wiki-metadata-form";
import { useI18n } from "@/lib/i18/i18n-context";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeSlug?: string;
  locale: "en" | "vi";
  onSlugEnTouched?: (touched: boolean) => void;
  onSlugViTouched?: (touched: boolean) => void;
}

export function WikiSettingsSheet({
  open,
  onOpenChange,
  excludeSlug,
  locale,
  onSlugEnTouched,
  onSlugViTouched,
}: Props) {
  const { t } = useI18n();
  const form = useFormContext<WikiFormValue>();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>{t("wiki.settings.title_heading")}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Tiêu đề */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("wiki.settings.title_section")}
            </h3>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("wiki.tab_en")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <I18nFormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title_vi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("wiki.tab_vi")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <I18nFormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* Đường dẫn */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("wiki.settings.url_section")}
            </h3>
            <div className="space-y-1">
              <Label>{t("wiki.tab_en")}</Label>
              <SlugEditRow name="slug" onTouchedChange={onSlugEnTouched} />
            </div>
            <div className="space-y-1">
              <Label>{t("wiki.tab_vi")}</Label>
              <SlugEditRow name="slug_vi" onTouchedChange={onSlugViTouched} />
            </div>
          </section>

          <Separator />

          {/* Tóm tắt */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("wiki.settings.summary_section")}
            </h3>
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("wiki.tab_en")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <I18nFormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="summary_vi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("wiki.tab_vi")}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <I18nFormMessage />
                </FormItem>
              )}
            />
          </section>

          <Separator />

          {/* Trạng thái */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("wiki.settings.status_section")}
            </h3>
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4 rounded border p-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium">
                      {field.value
                        ? t("wiki.settings.published_label")
                        : t("wiki.settings.draft_label")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {field.value
                        ? t("wiki.settings.published_desc")
                        : t("wiki.settings.draft_desc")}
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          </section>

          <Separator />

          {/* Thông tin bổ sung */}
          <section>
            <Controller
              control={form.control}
              name="metadata"
              render={({ field }) => (
                <WikiMetadataForm
                  value={field.value}
                  onChange={field.onChange}
                  excludeSlug={excludeSlug}
                  locale={locale}
                />
              )}
            />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
