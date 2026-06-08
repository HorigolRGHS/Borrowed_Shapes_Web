"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { TagsInput } from "@/components/wiki/metadata/tags-input";
import { useI18n } from "@/lib/i18/i18n-context";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  locale: "en" | "vi";
}

export function EditableTagsField({ locale }: Props) {
  const { t } = useI18n();
  const form = useFormContext<WikiFormValue>();
  const fieldName = locale === "vi" ? "metadata.tags_vi" : "metadata.tags";
  const value = useWatch({ control: form.control, name: fieldName }) ?? [];

  return (
    <TagsInput
      value={value as string[]}
      onChange={(next) =>
        form.setValue(fieldName, next, { shouldDirty: true })
      }
      placeholder={t("wiki.metadata.tag_placeholder")}
    />
  );
}
