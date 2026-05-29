"use client";

import { useFormContext, useWatch } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18/i18n-context";
import {
  WIKI_CATEGORIES,
  type WikiCategory,
} from "@/models/dtos/wiki-metadata.dto";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

export function EditableCategoryField() {
  const { t } = useI18n();
  const form = useFormContext<WikiFormValue>();
  const value = useWatch({ control: form.control, name: "metadata.category" });

  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) =>
        form.setValue(
          "metadata.category",
          v ? (v as WikiCategory) : undefined,
          { shouldDirty: true },
        )
      }
    >
      <SelectTrigger className="w-full h-7 text-sm">
        <SelectValue placeholder={t("wiki.metadata.category_none")} />
      </SelectTrigger>
      <SelectContent>
        {WIKI_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {t(`wiki.metadata.category.${c}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
