"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { useI18n } from "@/lib/i18/i18n-context";
import { slugifyEn, slugifyVi } from "@/lib/wiki/slug";
import {
  getWikiFormSubmitBlocker,
} from "@/components/wiki/wiki-form-submit-state";
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
  wikiId: string;
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
  wikiId,
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
  const titleVi = useWatch({ control: form.control, name: "titleVi" });
  const content = useWatch({ control: form.control, name: "content" });
  const contentVi = useWatch({ control: form.control, name: "contentVi" });
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
    if (!titleVi) return;
    const next = slugifyVi(titleVi);
    if (next !== form.getValues("slugVi")) {
      form.setValue("slugVi", next, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleVi, slugViTouched]);

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
    const value = form.getValues();
    const blocker = getWikiFormSubmitBlocker(value, form.formState.errors, mode);
    if (!valid || blocker) {
      if (blocker?.locale) setActiveLocale(blocker.locale);
      toast.error(t(blocker?.messageKey ?? "wiki.edit.save_blocked_generic"));
      return;
    }
    if (
      mode === "publish" &&
      value.content.trim().length > 0 &&
      value.content.trim() === value.contentVi.trim()
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

  const errors = form.formState.errors;
  const titleField = activeLocale === "vi" ? "titleVi" : "title";
  const slugField = activeLocale === "vi" ? "slugVi" : "slug";
  const summaryField = activeLocale === "vi" ? "summaryVi" : "summary";
  const titleValue = activeLocale === "vi" ? titleVi : title;
  const titleErrorKey =
    activeLocale === "vi" ? errors.titleVi?.message : errors.title?.message;
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
              key={wikiId}
              wikiId={wikiId}
              activeLocale={activeLocale}
              hideLocaleTabs
              value={{
                en: content,
                vi: contentVi,
              }}
              onChange={(next) => {
                form.setValue("content", next.en, { shouldDirty: true });
                form.setValue("contentVi", next.vi, { shouldDirty: true });
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
          <EditableInfobox
            locale={activeLocale}
            excludeSlug={excludeSlug}
            wikiId={wikiId}
          />
        }
      />

      <StickySaveBar
        isDirty={isDirty}
        saving={saving}
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
