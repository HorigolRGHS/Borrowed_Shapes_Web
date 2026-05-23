import * as z from "zod";
import { checkSlug } from "@/lib/wiki/slug";

function slugReason(slug: string): string | null {
  const issue = checkSlug(slug);
  if (!issue) return null;
  if (issue.reason === "reserved") return "wiki.reserved_slug_error";
  return "wiki.invalid_slug_error";
}

export const wikiFormSchema = z.object({
  title: z.string().trim().min(1, "wiki.invalid_slug_error"),
  title_vi: z.string().trim().min(1, "wiki.invalid_slug_error"),
  slug: z.string().superRefine((s, ctx) => {
    const reason = slugReason(s);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  }),
  slug_vi: z.string().superRefine((s, ctx) => {
    const reason = slugReason(s);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  }),
  summary: z.string(),
  summary_vi: z.string(),
  content: z.string(),
  content_vi: z.string(),
  isPublished: z.boolean(),
});

export type WikiFormValue = z.infer<typeof wikiFormSchema>;

export const emptyWikiFormValue: WikiFormValue = {
  title: "",
  title_vi: "",
  slug: "",
  slug_vi: "",
  summary: "",
  summary_vi: "",
  content: "",
  content_vi: "",
  isPublished: false,
};
