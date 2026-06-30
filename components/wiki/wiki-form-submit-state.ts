type WikiFormSubmitMode = "draft" | "publish";

type Locale = "en" | "vi";

type WikiFormSubmitValue = {
  title?: string;
  titleVi?: string;
  content?: string;
  contentVi?: string;
};

type WikiFormField =
  | "title"
  | "titleVi"
  | "slug"
  | "slugVi"
  | "summary"
  | "summaryVi"
  | "content"
  | "contentVi";

type WikiFormErrors = Partial<
  Record<WikiFormField | "metadata", { message?: unknown } | undefined>
>;

export interface WikiFormSubmitBlocker {
  messageKey: string;
  locale?: Locale;
}

const FIELD_LOCALE: Partial<Record<WikiFormField, Locale>> = {
  title: "en",
  titleVi: "vi",
  slug: "en",
  slugVi: "vi",
  summary: "en",
  summaryVi: "vi",
  content: "en",
  contentVi: "vi",
};

function fieldError(errors: WikiFormErrors, field: WikiFormField) {
  const message = errors[field]?.message;
  return typeof message === "string" ? message : null;
}

export function getWikiFormSubmitBlocker(
  value: WikiFormSubmitValue,
  errors: WikiFormErrors,
  mode: WikiFormSubmitMode,
): WikiFormSubmitBlocker | null {
  if (!value.title?.trim()) {
    return { messageKey: "wiki.edit.save_blocked_title", locale: "en" };
  }
  if (!value.titleVi?.trim()) {
    return { messageKey: "wiki.edit.save_blocked_title", locale: "vi" };
  }

  for (const field of ["slug", "slugVi", "summary", "summaryVi"] as const) {
    const messageKey = fieldError(errors, field);
    if (messageKey) return { messageKey, locale: FIELD_LOCALE[field] };
  }

  if (mode === "publish") {
    if (!value.content?.trim()) {
      return { messageKey: "wiki.publish_warn_empty", locale: "en" };
    }
    if (!value.contentVi?.trim()) {
      return { messageKey: "wiki.publish_warn_empty", locale: "vi" };
    }
  }

  if (errors.metadata) {
    return { messageKey: "wiki.edit.save_blocked_metadata" };
  }

  return null;
}
