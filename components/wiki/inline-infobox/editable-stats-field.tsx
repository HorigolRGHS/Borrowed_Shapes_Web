"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { StatsInput } from "@/components/wiki/metadata/stats-input";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

export function EditableStatsField() {
  const form = useFormContext<WikiFormValue>();
  const stats =
    useWatch({ control: form.control, name: "metadata.stats" }) ?? {};

  return (
    <StatsInput
      value={stats as Record<string, number>}
      onChange={(next) =>
        form.setValue("metadata.stats", next, { shouldDirty: true })
      }
    />
  );
}
