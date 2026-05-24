"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { slugifyEn, slugifyVi } from "@/lib/wiki/slug";
import {
  emptyWikiFormValue,
  wikiFormSchema,
  type WikiFormValue,
} from "@/models/dtos/wiki-form.dto";
import { Form } from "@/components/ui/form";
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
import { EditableTitle } from "./editable-title";
import { StickySaveBar } from "./sticky-save-bar";
import { WikiSettingsSheet } from "./wiki-settings-sheet";

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

  const [warnSame, setWarnSame] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
      const e = form.formState.errors;
      if (
        e.slug ||
        e.slug_vi ||
        e.summary ||
        e.summary_vi ||
        e.metadata ||
        (locale === "en" && e.title_vi) ||
        (locale === "vi" && e.title)
      ) {
        setSettingsOpen(true);
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
  const settingsHasError =
    !!errors.slug ||
    !!errors.slug_vi ||
    !!errors.summary ||
    !!errors.summary_vi ||
    !!errors.metadata ||
    (locale === "en" && !!errors.title_vi) ||
    (locale === "vi" && !!errors.title);

  const activeTitleField = locale === "vi" ? "title_vi" : "title";
  const activeTitleValue =
    locale === "vi" ? form.watch("title_vi") : form.watch("title");
  const activeTitleErrorKey =
    locale === "vi"
      ? errors.title_vi?.message
      : errors.title?.message;

  return (
    <Form {...form}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <EditableTitle
              value={activeTitleValue}
              onChange={(v) =>
                form.setValue(activeTitleField, v, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              placeholder={t("wiki.edit.title_placeholder")}
              error={activeTitleErrorKey ? t(activeTitleErrorKey) : null}
            />
            {headerSubtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {headerSubtitle}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="relative shrink-0"
          >
            <Settings className="h-4 w-4 mr-1" />
            {t("wiki.edit.settings_button")}
            {settingsHasError && (
              <span
                aria-hidden
                className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive"
              />
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="sr-only">{t("wiki.field_content")}</Label>
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
      </div>

      <StickySaveBar
        isDirty={isDirty}
        saving={saving}
        canSubmitDraft={canSubmitDraft}
        canPublish={canPublish}
        onSaveDraft={() => submitWithMode("draft")}
        onPublish={() => submitWithMode("publish")}
        onCancel={requestCancel}
      />

      <WikiSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        excludeSlug={excludeSlug}
        locale={locale}
        onSlugEnTouched={setSlugEnTouched}
        onSlugViTouched={setSlugViTouched}
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
