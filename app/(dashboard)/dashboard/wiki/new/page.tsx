"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { getApiErrorMessage, getApiErrorStatus, type ApiError } from "@/lib/wiki/http";
import { WIKI_TITLE_MAX_LENGTH } from "@/models/dtos/wiki-limits";
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
import { SlugEditRow } from "@/components/wiki/slug-edit-row";

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
  const [bumped, setBumped] = useState<BumpedNotice | null>(null);

  const form = useForm<Step1FormValue>({
    resolver: zodResolver(step1FormSchema),
    defaultValues: emptyStep1FormValue,
    mode: "onChange",
  });

  const title = form.watch("title");
  const titleVi = form.watch("titleVi");
  const slug = form.watch("slug");
  const slugVi = form.watch("slugVi");

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
    if (!titleVi) return;
    const handle = setTimeout(() => {
      const next = slugifyVi(titleVi);
      if (next !== form.getValues("slugVi")) {
        form.setValue("slugVi", next, { shouldValidate: true });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleVi, slugViTouched]);

  // Availability check (500ms after slug settles). Auto-bumps when slugs
  // were auto-generated. When user pencil-edited, surfaces the bump as a
  // suggestion but does not overwrite their value.
  const lastCheckedRef = useRef<string>("");
  useEffect(() => {
    if (!slug && !slugVi) return;
    const key = `${slug}|${slugVi}`;
    if (key === lastCheckedRef.current) return;

    const handle = setTimeout(async () => {
      lastCheckedRef.current = key;
      try {
        const result = await findAvailableSlugs(slug, slugVi);
        if (!result.bumped) {
          setBumped(null);
          return;
        }
        const enChanged = result.slug !== slug;
        const viChanged = result.slugVi !== slugVi;
        let notice: BumpedNotice | null = null;

        if (enChanged) {
          if (!slugEnTouched) {
            form.setValue("slug", result.slug, { shouldValidate: true });
          }
          notice = { original: slug, final: result.slug };
        }
        if (viChanged) {
          if (!slugViTouched) {
            form.setValue("slugVi", result.slugVi, { shouldValidate: true });
          }
          // Prefer the EN notice when both collided (single bumped notice
          // slot in the UI). VI surfaces only when EN didn't change.
          if (!notice) {
            notice = { original: slugVi, final: result.slugVi };
          }
        }
        setBumped(notice);
      } catch {
        // Availability check failed; submit-time 409 path will handle it.
      }
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, slugVi]);

  const onSubmit = async (value: Step1FormValue) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const detail = await createWiki({
        slug: value.slug,
        slugVi: value.slugVi,
        title: value.title,
        titleVi: value.titleVi,
        content: "",
        contentVi: "",
        isPublished: false,
      });
      router.replace(`/dashboard/wiki/${detail.id}/edit`);
      return;
    } catch (err) {
      const status = getApiErrorStatus(err as ApiError);
      const message = getApiErrorMessage(err as ApiError, t("wiki.new.create_failed"));

      if (status === 409) {
        try {
          const recheck = await findAvailableSlugs(value.slug, value.slugVi);
          if (recheck.bumped) {
            form.setValue("slug", recheck.slug);
            form.setValue("slugVi", recheck.slugVi);
            const detail = await createWiki({
              slug: recheck.slug,
              slugVi: recheck.slugVi,
              title: value.title,
              titleVi: value.titleVi,
              content: "",
              contentVi: "",
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
          setSubmitError(
            getApiErrorMessage(recheckErr as ApiError, t("wiki.new.create_failed")),
          );
          setSubmitting(false);
          return;
        }
      }
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const titlesFilled = !!title?.trim() && !!titleVi?.trim();
  const slugsValid =
    !form.formState.errors.slug && !form.formState.errors.slugVi;
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
                      <Input
                        {...field}
                        autoFocus
                        maxLength={WIKI_TITLE_MAX_LENGTH}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <SlugEditRow name="slug" onTouchedChange={setSlugEnTouched} />

              <FormField
                control={form.control}
                name="titleVi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("wiki.new.title_field")} ({t("wiki.tab_vi")})
                    </FormLabel>
                    <FormControl>
                      <Input {...field} maxLength={WIKI_TITLE_MAX_LENGTH} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <SlugEditRow name="slugVi" onTouchedChange={setSlugViTouched} />

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
