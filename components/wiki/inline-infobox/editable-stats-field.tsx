"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { StatsInput } from "@/components/wiki/metadata/stats-input";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  locale: "en" | "vi";
}

export function EditableStatsField({ locale }: Props) {
  const form = useFormContext<WikiFormValue>();
  const fieldName = locale === "vi" ? "metadata.stats_vi" : "metadata.stats";
  const stats = useWatch({ control: form.control, name: fieldName }) ?? {};

  return (
    <StatsInput
      key={fieldName}
      value={stats as Record<string, number>}
      onChange={(next) =>
        form.setValue(fieldName, next, { shouldDirty: true })
      }
    />
  );
}
