"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { RelatedPagesPicker } from "@/components/wiki/metadata/related-pages-picker";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  excludeSlug?: string;
  locale: "en" | "vi";
}

export function EditableRelatedField({ excludeSlug, locale }: Props) {
  const form = useFormContext<WikiFormValue>();
  const value =
    useWatch({ control: form.control, name: "metadata.relatedPages" }) ?? [];

  return (
    <RelatedPagesPicker
      value={value as string[]}
      onChange={(next) =>
        form.setValue("metadata.relatedPages", next, { shouldDirty: true })
      }
      excludeSlug={excludeSlug}
      locale={locale}
    />
  );
}
