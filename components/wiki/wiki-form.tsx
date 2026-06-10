"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useI18n } from "@/lib/i18/i18n-context";
import { slugifyEn, slugifyVi } from "@/lib/wiki/slug";
import {
  emptyWikiFormValue,
  wikiFormSchema,
  type WikiFormValue,
} from "@/models/dtos/wiki-form.dto";
import { Form } from "@/components/ui/form";
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
import { EditableTitle } from "./editable-title";
import { EditableSummary } from "./editable-summary";
import { LocaleToggle } from "./locale-toggle";
import { SlugEditRow } from "./slug-edit-row";
import { StickySaveBar } from "./sticky-save-bar";
import { WikiPageShell } from "./wiki-page-shell";
import { WikiPageHeader } from "./wiki-page-header";
import { EditableInfobox } from "./inline-infobox/editable-infobox";

export type { WikiFormValue };
export { emptyWikiFormValue };

const WikiEditor = dynamic(
  () => import("./editor/ckeditor").then((m) => m.WikiEditor),
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
  onSubmit: (
    value: WikiFormValue,
    mode: "draft" | "publish",
  ) => Promise<{ ok: boolean } | void>;
  onCancel?: () => void;
  saving?: boolean;
  submitError?: string | null;
  isEdit?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  excludeSlug?: string;
  locale: "en" | "vi";
  headerSubtitle?: ReactNode;
}

export function WikiForm({
  initial,
  onSubmit,
  onCancel,
  saving = false,
  submitError = null,
  isEdit = false,
  onDirtyChange,
  excludeSlug,
  locale,
  headerSubtitle,
}: Props) {
  const { t } = useI18n();
  const form = useForm<WikiFormValue>({
    resolver: zodResolver(wikiFormSchema),
    defaultValues: initial,
    mode: "onChange",
  });

  const [activeLocale, setActiveLocale] = useState<"en" | "vi">(locale);
  const [warnSame, setWarnSame] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [slugEnTouched, setSlugEnTouched] = useState(isEdit);
  const [slugViTouched, setSlugViTouched] = useState(isEdit);

  const title = useWatch({ control: form.control, name: "title" });
  const title_vi = useWatch({ control: form.control, name: "title_vi" });
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Auto-slug from title when not manually touched.
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

  // Beforeunload warning while dirty.
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
    if (!valid) {
      // Surface the locale whose inline field is blocking, so the user can see
      // and fix it (each locale shows one title/summary/slug at a time).
      const e = form.formState.errors;
      const enHasError = !!e.title || !!e.slug || !!e.summary;
      const viHasError = !!e.title_vi || !!e.slug_vi || !!e.summary_vi;
      if (activeLocale === "en" && !enHasError && viHasError) {
        setActiveLocale("vi");
      } else if (activeLocale === "vi" && !viHasError && enHasError) {
        setActiveLocale("en");
      }
      return;
    }
    const value = form.getValues();
    if (
      mode === "publish" &&
      value.content.trim().length > 0 &&
      value.content.trim() === value.content_vi.trim()
    ) {
      setWarnSame(true);
      return;
    }
    const result = await onSubmit(value, mode);
    if (result?.ok) {
      form.reset(value, { keepDirty: false });
    }
  };

  const handlePublishConfirmed = async () => {
    setWarnSame(false);
    const value = form.getValues();
    const result = await onSubmit(value, "publish");
    if (result?.ok) {
      form.reset(value, { keepDirty: false });
    }
  };

  const requestCancel = () => {
    if (form.formState.isDirty) {
      setConfirmCancel(true);
    } else {
      onCancel?.();
    }
  };

  const titlesFilled =
    !!form.watch("title")?.trim() && !!form.watch("title_vi")?.trim();
  const contentFilled =
    !!form.watch("content")?.trim() && !!form.watch("content_vi")?.trim();
  const slugsValid =
    !form.formState.errors.slug && !form.formState.errors.slug_vi;
  const canSubmitDraft = titlesFilled && slugsValid && !saving;
  const canPublish = canSubmitDraft && contentFilled;

  const errors = form.formState.errors;
  const titleField = activeLocale === "vi" ? "title_vi" : "title";
  const slugField = activeLocale === "vi" ? "slug_vi" : "slug";
  const summaryField = activeLocale === "vi" ? "summary_vi" : "summary";
  const titleValue =
    activeLocale === "vi" ? form.watch("title_vi") : form.watch("title");
  const titleErrorKey =
    activeLocale === "vi" ? errors.title_vi?.message : errors.title?.message;
  const summaryPlaceholder =
    activeLocale === "vi"
      ? t("wiki.edit.summary_placeholder_vi")
      : t("wiki.edit.summary_placeholder_en");

  return (
    <Form {...form}>
      <WikiPageShell
        header={
          <WikiPageHeader
            mode="edit"
            byline={headerSubtitle}
            toolbarNode={
              <LocaleToggle
                value={activeLocale}
                onChange={setActiveLocale}
                enLabel={t("wiki.tab_en")}
                viLabel={t("wiki.tab_vi")}
              />
            }
            titleNode={
              <div className="space-y-2">
                <EditableTitle
                  value={titleValue}
                  onChange={(v) =>
                    form.setValue(titleField, v, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder={t("wiki.edit.title_placeholder")}
                  error={titleErrorKey ? t(titleErrorKey) : null}
                />
                <SlugEditRow
                  key={activeLocale}
                  name={slugField}
                  onTouchedChange={
                    activeLocale === "vi"
                      ? setSlugViTouched
                      : setSlugEnTouched
                  }
                />
              </div>
            }
            summaryNode={
              <EditableSummary
                key={activeLocale}
                fieldName={summaryField}
                placeholder={summaryPlaceholder}
              />
            }
          />
        }
        body={
          <div className="space-y-4">
            <Label className="sr-only">{t("wiki.field_content")}</Label>
            <WikiEditor
              activeLocale={activeLocale}
              hideLocaleTabs
              value={{
                en: form.watch("content"),
                vi: form.watch("content_vi"),
              }}
              onChange={(next) => {
                form.setValue("content", next.en, { shouldDirty: true });
                form.setValue("content_vi", next.vi, { shouldDirty: true });
              }}
            />
            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </div>
        }
        infobox={
          <EditableInfobox locale={activeLocale} excludeSlug={excludeSlug} />
        }
      />

      <StickySaveBar
        isDirty={isDirty}
        saving={saving}
        canSubmitDraft={canSubmitDraft}
        canPublish={canPublish}
        onSaveDraft={() => submitWithMode("draft")}
        onPublish={() => submitWithMode("publish")}
        onCancel={requestCancel}
      />

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

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("wiki.edit.cancel_confirm_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("wiki.edit.cancel_confirm_message")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("wiki.edit.cancel_confirm_stay")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCancel(false);
                onCancel?.();
              }}
            >
              {t("wiki.edit.cancel_confirm_leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
