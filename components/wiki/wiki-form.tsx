"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@/lib/i18/i18n-context";
import { slugifyEn, slugifyVi } from "@/lib/wiki/slug";
import {
  emptyWikiFormValue,
  wikiFormSchema,
  type WikiFormValue,
} from "@/models/dtos/wiki-form.dto";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { I18nFormMessage } from "@/components/ui/i18n-form-message";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type { WikiFormValue };
export { emptyWikiFormValue };

const TiptapEditor = dynamic(
  () => import("./editor/tiptap-editor").then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="border rounded-md p-4 text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
);

interface Props {
  initial: WikiFormValue;
  onSubmit: (value: WikiFormValue, mode: "draft" | "publish") => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  submitError?: string | null;
  isEdit?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

export function WikiForm({
  initial,
  onSubmit,
  onCancel,
  saving = false,
  submitError = null,
  isEdit = false,
  onDirtyChange,
}: Props) {
  const { t } = useI18n();
  const form = useForm<WikiFormValue>({
    resolver: zodResolver(wikiFormSchema),
    defaultValues: initial,
    mode: "onChange",
  });

  const [warnSame, setWarnSame] = useState(false);
  // Track whether the user has manually edited the slug. Edit mode starts true
  // (server-provided slug must not be auto-overwritten by title changes); create
  // mode starts false so slug auto-fills until the user types in the slug field.
  const [slugEnTouched, setSlugEnTouched] = useState(isEdit);
  const [slugViTouched, setSlugViTouched] = useState(isEdit);

  const title = useWatch({ control: form.control, name: "title" });
  const title_vi = useWatch({ control: form.control, name: "title_vi" });
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Auto-slug from title when the slug hasn't been manually touched yet.
  useEffect(() => {
    if (slugEnTouched) return;
    if (!title) return;
    const next = slugifyEn(title);
    if (next !== form.getValues("slug")) {
      form.setValue("slug", next, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slugEnTouched]);

  useEffect(() => {
    if (slugViTouched) return;
    if (!title_vi) return;
    const next = slugifyVi(title_vi);
    if (next !== form.getValues("slug_vi")) {
      form.setValue("slug_vi", next, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title_vi, slugViTouched]);

  // Beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [form]);

  const submitWithMode = async (mode: "draft" | "publish") => {
    const valid = await form.trigger();
    if (!valid) return;
    const value = form.getValues();
    if (
      mode === "publish" &&
      value.content.trim().length > 0 &&
      value.content.trim() === value.content_vi.trim()
    ) {
      setWarnSame(true);
      return;
    }
    await onSubmit(value, mode);
  };

  const handlePublishConfirmed = async () => {
    setWarnSame(false);
    await onSubmit(form.getValues(), "publish");
  };

  const titlesFilled =
    !!form.watch("title")?.trim() && !!form.watch("title_vi")?.trim();
  const contentFilled =
    !!form.watch("content")?.trim() && !!form.watch("content_vi")?.trim();
  const slugsValid = !form.formState.errors.slug && !form.formState.errors.slug_vi;
  const canSubmitDraft = titlesFilled && slugsValid && !saving;
  const canPublish = canSubmitDraft && contentFilled;

  return (
    <Form {...form}>
      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("wiki.field_title_en")}</FormLabel>
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
                <FormLabel>{t("wiki.field_title_vi")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("wiki.field_slug_en")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => {
                      setSlugEnTouched(true);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="slug_vi"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("wiki.field_slug_vi")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => {
                      setSlugViTouched(true);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("wiki.field_summary_en")}</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} />
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
                <FormLabel>{t("wiki.field_summary_vi")}</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} />
                </FormControl>
                <I18nFormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("wiki.field_content")}</Label>
          <TiptapEditor
            value={{
              en: form.watch("content"),
              vi: form.watch("content_vi"),
            }}
            onChange={(next) => {
              form.setValue("content", next.en, { shouldDirty: true });
              form.setValue("content_vi", next.vi, { shouldDirty: true });
            }}
          />
        </div>

        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canSubmitDraft}
            onClick={() => submitWithMode("draft")}
          >
            {t("wiki.save_draft_button")}
          </Button>
          <Button
            type="button"
            disabled={!canPublish}
            onClick={() => submitWithMode("publish")}
          >
            {t("wiki.save_publish_button")}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <AlertDialog open={warnSame} onOpenChange={setWarnSame}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Same content in both languages</AlertDialogTitle>
            <AlertDialogDescription>
              {t("wiki.publish_warn_same_content")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublishConfirmed}>
              Publish anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
