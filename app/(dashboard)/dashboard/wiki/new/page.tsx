"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, X } from "lucide-react";
import { useI18n } from "@/lib/i18/i18n-context";
import { createWiki } from "@/lib/wiki/api";
import {
  emptyStep1FormValue,
  step1FormSchema,
  type Step1FormValue,
} from "@/models/dtos/wiki-create-step1.dto";
import { slugifyEn, slugifyVi } from "@/lib/wiki/slug";
import {
  findAvailableSlugs,
  SlugAvailabilityExhausted,
} from "@/lib/wiki/slug-availability";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { I18nFormMessage } from "@/components/ui/i18n-form-message";

interface BumpedNotice {
  original: string;
  final: string;
}

export default function AdminWikiNewPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slugEnTouched, setSlugEnTouched] = useState(false);
  const [slugViTouched, setSlugViTouched] = useState(false);
  const [editingEn, setEditingEn] = useState(false);
  const [editingVi, setEditingVi] = useState(false);
  const [bumped, setBumped] = useState<BumpedNotice | null>(null);

  const form = useForm<Step1FormValue>({
    resolver: zodResolver(step1FormSchema),
    defaultValues: emptyStep1FormValue,
    mode: "onChange",
  });

  const title = form.watch("title");
  const title_vi = form.watch("title_vi");
  const slug = form.watch("slug");
  const slug_vi = form.watch("slug_vi");

  // Auto-slug from title (300ms debounce).
  useEffect(() => {
    if (slugEnTouched) return;
    if (!title) return;
    const handle = setTimeout(() => {
      const next = slugifyEn(title);
      if (next !== form.getValues("slug")) {
        form.setValue("slug", next, { shouldValidate: true });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, slugEnTouched]);

  useEffect(() => {
    if (slugViTouched) return;
    if (!title_vi) return;
    const handle = setTimeout(() => {
      const next = slugifyVi(title_vi);
      if (next !== form.getValues("slug_vi")) {
        form.setValue("slug_vi", next, { shouldValidate: true });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title_vi, slugViTouched]);

  // Availability check (500ms after slug settles). Auto-bumps when slugs
  // were auto-generated. When user pencil-edited, surfaces the bump as a
  // suggestion but does not overwrite their value.
  const lastCheckedRef = useRef<string>("");
  useEffect(() => {
    if (!slug && !slug_vi) return;
    const key = `${slug}|${slug_vi}`;
    if (key === lastCheckedRef.current) return;

    const handle = setTimeout(async () => {
      lastCheckedRef.current = key;
      try {
        const result = await findAvailableSlugs(slug, slug_vi);
        if (!result.bumped) {
          setBumped(null);
          return;
        }
        const enChanged = result.slug !== slug;
        const viChanged = result.slug_vi !== slug_vi;
        let notice: BumpedNotice | null = null;

        if (enChanged) {
          if (!slugEnTouched) {
            form.setValue("slug", result.slug, { shouldValidate: true });
          }
          notice = { original: slug, final: result.slug };
        }
        if (viChanged) {
          if (!slugViTouched) {
            form.setValue("slug_vi", result.slug_vi, { shouldValidate: true });
          }
          // Prefer the EN notice when both collided (single bumped notice
          // slot in the UI). VI surfaces only when EN didn't change.
          if (!notice) {
            notice = { original: slug_vi, final: result.slug_vi };
          }
        }
        setBumped(notice);
      } catch {
        // Availability check failed; submit-time 409 path will handle it.
      }
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, slug_vi]);

  const onSubmit = async (value: Step1FormValue) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const detail = await createWiki({
        slug: value.slug,
        slug_vi: value.slug_vi,
        title: value.title,
        title_vi: value.title_vi,
        content: "",
        content_vi: "",
        isPublished: false,
      });
      router.replace(`/dashboard/wiki/${detail.id}/edit`);
      return;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;

      if (status === 409) {
        try {
          const recheck = await findAvailableSlugs(value.slug, value.slug_vi);
          if (recheck.bumped) {
            form.setValue("slug", recheck.slug);
            form.setValue("slug_vi", recheck.slug_vi);
            const detail = await createWiki({
              slug: recheck.slug,
              slug_vi: recheck.slug_vi,
              title: value.title,
              title_vi: value.title_vi,
              content: "",
              content_vi: "",
              isPublished: false,
            });
            router.replace(`/dashboard/wiki/${detail.id}/edit`);
            return;
          }
        } catch (recheckErr) {
          if (recheckErr instanceof SlugAvailabilityExhausted) {
            setSubmitError(t("wiki.new.create_failed"));
            setSubmitting(false);
            return;
          }
          const retryMessage = (
            recheckErr as { response?: { data?: { message?: string } } }
          )?.response?.data?.message;
          setSubmitError(retryMessage ?? t("wiki.new.create_failed"));
          setSubmitting(false);
          return;
        }
      }
      setSubmitError(message ?? t("wiki.new.create_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const renderSlugRow = (
    slugValue: string,
    editing: boolean,
    setEditing: (b: boolean) => void,
    setTouched: (b: boolean) => void,
    fieldName: "slug" | "slug_vi",
  ) => (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <FormControl>
                  <Input
                    {...field}
                    autoFocus
                    onChange={(e) => {
                      setTouched(true);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(false)}
                  aria-label={t("wiki.new.confirm_slug")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground flex-1 truncate">
                  {t("wiki.new.url_preview")}{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">
                    /wiki/{slugValue || "…"}
                  </code>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setTouched(true);
                    setEditing(true);
                  }}
                  aria-label={t("wiki.new.edit_slug")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <I18nFormMessage />
        </FormItem>
      )}
    />
  );

  const titlesFilled = !!title?.trim() && !!title_vi?.trim();
  const slugsValid =
    !form.formState.errors.slug && !form.formState.errors.slug_vi;
  const canSubmit = titlesFilled && slugsValid && !submitting;

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <nav className="text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/wiki" className="hover:text-foreground">
          Wiki
        </Link>
        <span className="mx-2">›</span>
        <span className="text-foreground">{t("wiki.new.title_step1")}</span>
      </nav>

      <h1 className="text-2xl font-bold tracking-tight mb-6">
        {t("wiki.new.title_step1")}
      </h1>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form
              className="space-y-6"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("wiki.new.title_field")} ({t("wiki.tab_en")})
                    </FormLabel>
                    <FormControl>
                      <Input {...field} autoFocus />
                    </FormControl>
                    <I18nFormMessage />
                  </FormItem>
                )}
              />

              {renderSlugRow(
                slug,
                editingEn,
                setEditingEn,
                setSlugEnTouched,
                "slug",
              )}

              <FormField
                control={form.control}
                name="title_vi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("wiki.new.title_field")} ({t("wiki.tab_vi")})
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <I18nFormMessage />
                  </FormItem>
                )}
              />

              {renderSlugRow(
                slug_vi,
                editingVi,
                setEditingVi,
                setSlugViTouched,
                "slug_vi",
              )}

              {bumped && (
                <p className="text-xs text-muted-foreground">
                  {t("wiki.new.slug_bumped")
                    .replace("{original}", bumped.original)
                    .replace("{final}", bumped.final)}
                </p>
              )}

              {submitError && (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push("/dashboard/wiki")}
                  disabled={submitting}
                >
                  {t("wiki.new.cancel_button")}
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {submitting
                    ? t("wiki.new.creating")
                    : t("wiki.new.create_button")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
