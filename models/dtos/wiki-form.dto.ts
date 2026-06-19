import * as z from "zod";
import { checkSlug } from "@/lib/wiki/slug";
import {
  wikiMetadataSchema,
  emptyWikiMetadata,
} from "./wiki-metadata.dto";

function slugReason(slug: string): string | null {
  const issue = checkSlug(slug);
  if (!issue) return null;
  if (issue.reason === "reserved") return "wiki.reserved_slug_error";
  return "wiki.invalid_slug_error";
}

export const wikiFormSchema = z.object({
  title: z.string().trim().min(1, "wiki.title_required_error"),
  titleVi: z.string().trim().min(1, "wiki.title_required_error"),
  slug: z.string().superRefine((s, ctx) => {
    const reason = slugReason(s);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  }),
  slugVi: z.string().superRefine((s, ctx) => {
    const reason = slugReason(s);
    if (reason) ctx.addIssue({ code: "custom", message: reason });
  }),
  summary: z.string(),
  summaryVi: z.string(),
  content: z.string(),
  contentVi: z.string(),
  isPublished: z.boolean(),
  metadata: wikiMetadataSchema,
});

export type WikiFormValue = z.infer<typeof wikiFormSchema>;

export const emptyWikiFormValue: WikiFormValue = {
  title: "",
  titleVi: "",
  slug: "",
  slugVi: "",
  summary: "",
  summaryVi: "",
  content: "",
  contentVi: "",
  isPublished: false,
  metadata: emptyWikiMetadata,
};
