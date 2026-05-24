import * as z from "zod";
import { checkSlug } from "@/lib/wiki/slug";

function slugReason(slug: string): string | null {
  const issue = checkSlug(slug);
  if (!issue) return null;
  if (issue.reason === "reserved") return "wiki.reserved_slug_error";
  return "wiki.invalid_slug_error";
}

export const step1FormSchema = z.object({
  title: z.string().trim().min(1, "wiki.title_required_error"),
  title_vi: z.string().trim().min(1, "wiki.title_required_error"),
  slug: z.string().superRefine((s, ctx) => {
    const reason = slugReason(s);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  }),
  slug_vi: z.string().superRefine((s, ctx) => {
    const reason = slugReason(s);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  }),
});

export type Step1FormValue = z.infer<typeof step1FormSchema>;

export const emptyStep1FormValue: Step1FormValue = {
  title: "",
  title_vi: "",
  slug: "",
  slug_vi: "",
};
