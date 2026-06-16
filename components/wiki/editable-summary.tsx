"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import type { WikiFormValue } from "@/models/dtos/wiki-form.dto";

interface Props {
  fieldName: "summary" | "summaryVi";
  placeholder: string;
}

export function EditableSummary({ fieldName, placeholder }: Props) {
  const form = useFormContext<WikiFormValue>();
  const value = useWatch({ control: form.control, name: fieldName }) ?? "";
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.setSelectionRange(value.length, value.length);
    }
  }, [editing, value]);

  if (editing) {
    return (
      <Textarea
        ref={taRef}
        rows={2}
        value={value}
        onChange={(e) =>
          form.setValue(fieldName, e.target.value, { shouldDirty: true })
        }
        onBlur={() => setEditing(false)}
        className="text-base text-muted-foreground"
        placeholder={placeholder}
      />
    );
  }

  return (
    <p
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      className="text-base text-muted-foreground cursor-text rounded hover:bg-muted/30 px-1 -mx-1 min-h-6"
    >
      {value || (
        <span className="text-muted-foreground/60 italic">{placeholder}</span>
      )}
    </p>
  );
}
