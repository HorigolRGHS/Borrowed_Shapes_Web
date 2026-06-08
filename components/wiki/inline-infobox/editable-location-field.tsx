"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  locale: "en" | "vi";
  placeholder: string;
}

export function EditableLocationField({ locale, placeholder }: Props) {
  const form = useFormContext<WikiFormValue>();
  const fieldName =
    locale === "vi" ? "metadata.location_vi" : "metadata.location";
  const value = useWatch({ control: form.control, name: fieldName }) ?? "";

  return (
    <Input
      value={value}
      onChange={(e) =>
        form.setValue(fieldName, e.target.value, { shouldDirty: true })
      }
      placeholder={placeholder}
      maxLength={120}
      className="h-7 text-sm"
    />
  );
}
