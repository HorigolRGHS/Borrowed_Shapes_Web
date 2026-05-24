"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxItemLength?: number;
  className?: string;
  "aria-labelledby"?: string;
}

export function TagsInput({
  value,
  onChange,
  placeholder,
  maxItems = 20,
  maxItemLength = 40,
  className,
  ...rest
}: Props) {
  const [draft, setDraft] = React.useState("");
  const atMax = value.length >= maxItems;

  const commit = (raw: string) => {
    const trimmed = raw.trim().slice(0, maxItemLength);
    if (!trimmed) return;
    const exists = value.some(
      (v) => v.toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  };

  const removeAt = (i: number) => {
    const next = [...value];
    next.splice(i, 1);
    onChange(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
      {...rest}
    >
      {value.map((tag, i) => (
        <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1">
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="rounded-sm hover:bg-muted-foreground/20"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={atMax ? undefined : placeholder}
        disabled={atMax}
        className="h-7 flex-1 min-w-[8ch] border-0 px-1 shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
